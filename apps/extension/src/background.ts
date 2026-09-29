import {AttentionRuntime} from "@attention-firewall/attention-runtime";
import {parseInterventionProfile} from "@attention-firewall/local-store";
import {sanitizeIntent,type IntentEnvelope} from "@attention-firewall/intent-engine";
import {validateRuntimeSample} from "@attention-firewall/runtime-protocol";
import {buildAttentionTwin} from "@attention-firewall/personalization-engine";
import {validateRules,type PolicyRule} from "@attention-firewall/policy-engine";
import {DEFAULT_HISTORY,addDailySeconds,emptyDay,recordInterventionOutcome,pruneHistory,upsertDay,type DailyHistory} from "@attention-firewall/local-analytics";

interface ActivitySample{type:"ACTIVITY_SAMPLE";scrollCount:number;interactionCount:number;elapsedSeconds:number;domain:string}
interface SessionStart{type:"SESSION_START";domain:string}
interface SessionRuntimeState{domain:string;runtime:AttentionRuntime;lastInterventionAt:number;contextSwitches:number}

const CONTENT_SCRIPT_ID="attention-firewall-local-detector";
const runtimes=new Map<number,SessionRuntimeState>();
const pendingRecovery=new Map<number,{startedAt:number}>();

chrome.runtime.onInstalled.addListener(()=>void syncProtection());
chrome.runtime.onStartup.addListener(()=>void syncProtection());
chrome.permissions.onAdded.addListener(()=>void syncProtection());
chrome.permissions.onRemoved.addListener(()=>void handlePermissionRemoved());

chrome.runtime.onMessage.addListener((message:unknown,sender)=>{
 const control=messageType(message);
 if(control==="ENABLE_WEB_PROTECTION"||control==="DISABLE_WEB_PROTECTION"||control==="CLEAR_LOCAL_DATA"){
  if(!sender.url?.startsWith(chrome.runtime.getURL("")))return;
  if(control==="ENABLE_WEB_PROTECTION")void enableWebProtection();
  else if(control==="DISABLE_WEB_PROTECTION")void disableWebProtection();
  else void clearLocalData();
  return;
 }
 if(sender.tab?.id===undefined)return;

 if(isSessionStart(message)){
  void handleSessionStart(sender.tab.id,message);
  return;
 }
 if(isActivityMessage(message)){
  void handleActivity(sender.tab.id,message);
  return;
 }
 if(isInterventionResponse(message)){
  if(message.outcome==="exited")pendingRecovery.set(sender.tab.id,{startedAt:Date.now()});
  void handleResponse(message.intervention,message.outcome);
  return;
 }
 if(isRecoveryCompleted(message)){
  void handleRecovery(sender.tab.id,message.durationSeconds);
 }
});

async function syncProtection(){
 const granted=await chrome.permissions.contains({origins:["https://*/*"],permissions:["scripting"]});
 const stored=await chrome.storage.local.get("webProtectionEnabled");
 if(granted&&stored.webProtectionEnabled===true){
  await registerDetector();
 }else if(stored.webProtectionEnabled===true&&!granted){
  await chrome.storage.local.set({webProtectionEnabled:false});
 }
}

async function enableWebProtection(){
 const granted=await chrome.permissions.contains({origins:["https://*/*"]});
 if(!granted){
  await chrome.storage.local.set({webProtectionEnabled:false});
  return;
 }
 await chrome.storage.local.set({webProtectionEnabled:true});
 await registerDetector();
}

async function disableWebProtection(){
 await unregisterDetector();
 await chrome.permissions.remove({origins:["https://*/*"]}).catch(()=>false);
 await chrome.storage.local.set({webProtectionEnabled:false});
 runtimes.clear();
 pendingRecovery.clear();
}

async function clearLocalData(){
 await unregisterDetector();
 await chrome.storage.local.clear();
 runtimes.clear();
 pendingRecovery.clear();
}

async function handlePermissionRemoved(){
 const current=await chrome.storage.local.get("webProtectionEnabled");
 if(current.webProtectionEnabled===true){
  await chrome.storage.local.set({webProtectionEnabled:false});
 }
 await unregisterDetector();
 runtimes.clear();
}

async function registerDetector(){
 const existing=await chrome.scripting.getRegisteredContentScripts({ids:[CONTENT_SCRIPT_ID]});
 if(existing.length>0)return;
 await chrome.scripting.registerContentScripts([{
  id:CONTENT_SCRIPT_ID,
  matches:["https://*/*"],
  js:["content.js"],
  runAt:"document_idle",
  allFrames:false,
  persistAcrossSessions:true,
  world:"ISOLATED"
 }]);
}

async function unregisterDetector(){
 await chrome.scripting.unregisterContentScripts({ids:[CONTENT_SCRIPT_ID]}).catch(()=>{});
}

async function handleActivity(tabId:number,message:ActivitySample){
 const state=runtimes.get(tabId);
 const stored=await chrome.storage.local.get(["currentIntent","interventionProfile","protectionMode","dailySummary","dailyHistory","rules"]);
 const intent=sanitizeIntent(stored.currentIntent);
 const profile=parseInterventionProfile(stored.interventionProfile);
 const savedHistory=stored.dailyHistory as DailyHistory|undefined;
 const attentionTwin=buildAttentionTwin(savedHistory?.version===1?savedHistory.days:[],profile);
 const protectionMode=stored.protectionMode==="strict"?"strict":"adaptive";

 let current=state;
 if(!current){
  current={domain:message.domain,lastInterventionAt:0,contextSwitches:0,runtime:new AttentionRuntime({
   protectionMode,
   profile,
   rules:safeRules(stored.rules),
   attentionTwin,
   intent:intent as IntentEnvelope|undefined
  },undefined,typeof stored.dailySummary==="object"&&stored.dailySummary?stored.dailySummary:undefined)};
  runtimes.set(tabId,current);
  current.runtime.begin(message.domain);
 }else if(current.domain!==message.domain){
  current.domain=message.domain;
  current.contextSwitches=Math.min(current.contextSwitches+1,1000);
 }

 current.runtime.setConfig({
  protectionMode,
  profile,
  rules:safeRules(stored.rules),
  attentionTwin,
  intent:intent as IntentEnvelope|undefined
 });
 if(typeof stored.dailySummary==="object"&&stored.dailySummary){
  current.runtime.setSummary(stored.dailySummary);
 }

 const hour=new Date().getHours();

 const result=current.runtime.sample({
  elapsedSeconds:message.elapsedSeconds,
  interactions:message.interactionCount,
  scrolls:message.scrollCount,
  domain:message.domain,
  contextSwitches:current.contextSwitches,
  lateNightRisk:hour>=22||hour<6?1:0
 });

 const existingHistory=stored.dailyHistory as DailyHistory|undefined;
 const nextHistory=pruneHistory(upsertDay(existingHistory?.version===1?existingHistory:DEFAULT_HISTORY,result.dailySummary),30);
 await chrome.storage.local.set({dailySummary:result.dailySummary,dailyHistory:nextHistory});

 if(result.intervention!=="none"&&Date.now()-current.lastInterventionAt>=60_000){
  current.lastInterventionAt=Date.now();
  await chrome.tabs.sendMessage(tabId,{type:"ATTENTION_INTERVENTION",intervention:result.intervention,recoveryMinutes:result.recoveryMinutes}).catch(()=>{});
 }
}

async function handleResponse(intervention:string,outcome:"continued"|"exited"){
 const stored=await chrome.storage.local.get(["interventionProfile","dailySummary","dailyHistory"]);
 const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{},rules:[]};
 profile.attemptsByIntervention[intervention]=(profile.attemptsByIntervention[intervention]??0)+1;
 if(outcome==="exited")profile.successByIntervention[intervention]=(profile.successByIntervention[intervention]??0)+1;

 for(const state of runtimes.values())state.runtime.respond(intervention,outcome);
 let summary=stored.dailySummary as ReturnType<typeof emptyDay>|undefined;
 summary=summary&&summary.date===new Date().toISOString().slice(0,10)?summary:emptyDay();
 summary=recordInterventionOutcome(summary,outcome==="exited");
 const existingHistory=stored.dailyHistory as DailyHistory|undefined;
 const nextHistory=pruneHistory(upsertDay(existingHistory?.version===1?existingHistory:DEFAULT_HISTORY,summary),30);
 await chrome.storage.local.set({interventionProfile:profile,dailySummary:summary,dailyHistory:nextHistory});
}

async function handleSessionStart(tabId:number,message:SessionStart){
 const stored=await chrome.storage.local.get(["currentIntent","interventionProfile","protectionMode","dailySummary"]);
 const intent=sanitizeIntent(stored.currentIntent);
 const profile=parseInterventionProfile(stored.interventionProfile);
 const protectionMode=stored.protectionMode==="strict"?"strict":"adaptive";
 let state=runtimes.get(tabId);
 if(!state){
  state={domain:message.domain,lastInterventionAt:0,contextSwitches:0,runtime:new AttentionRuntime({
   protectionMode,profile,rules:safeRules(stored.rules),intent:intent as IntentEnvelope|undefined
  },undefined,typeof stored.dailySummary==="object"&&stored.dailySummary?stored.dailySummary:undefined)};
  runtimes.set(tabId,state);
  state.runtime.begin(message.domain);
 }else if(state.domain!==message.domain){
  state.domain=message.domain;
  state.contextSwitches=Math.min(state.contextSwitches+1,1000);
 }else{
  state.runtime.reopen();
 }
}

function isSessionStart(value:unknown):value is SessionStart{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="SESSION_START"&&v.protocolVersion===1&&typeof v.domain==="string"&&v.domain.length>=1&&v.domain.length<=253;
}

function safeRules(value:unknown):PolicyRule[]{try{return validateRules(value)}catch{return []}}

async function handleRecovery(tabId:number,durationSeconds:number){
 const pending=pendingRecovery.get(tabId);
 if(!pending||Date.now()-pending.startedAt>60_000){pendingRecovery.delete(tabId);return;}
 const bounded=Math.max(120,Math.min(durationSeconds,600));
 const stored=await chrome.storage.local.get(["dailySummary","dailyHistory"]);
 let summary=stored.dailySummary as ReturnType<typeof emptyDay>|undefined;
 summary=summary&&summary.date===new Date().toISOString().slice(0,10)?summary:emptyDay();
 summary=addDailySeconds(summary,"attentionRecoveredSeconds",bounded);
 const existingHistory=stored.dailyHistory as DailyHistory|undefined;
 const nextHistory=pruneHistory(upsertDay(existingHistory?.version===1?existingHistory:DEFAULT_HISTORY,summary),30);
 pendingRecovery.delete(tabId);
 await chrome.storage.local.set({dailySummary:summary,dailyHistory:nextHistory});
}

function isRecoveryCompleted(value:unknown):value is {type:"RECOVERY_COMPLETED";durationSeconds:number}{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="RECOVERY_COMPLETED"&&typeof v.durationSeconds==="number"&&Number.isFinite(v.durationSeconds)&&v.durationSeconds>=120&&v.durationSeconds<=600;
}

function messageType(value:unknown):string{
 if(!value||typeof value!=="object")return "";
 const type=(value as Record<string,unknown>).type;
 return typeof type==="string"&&type.length<=64?type:"";
}

function isActivityMessage(value:unknown):value is ActivitySample{
 try{
  if(!value||typeof value!=="object")return false;
  const v=value as Record<string,unknown>;
  if(v.type!=="ACTIVITY_SAMPLE")return false;
  const sample=validateRuntimeSample({
   protocolVersion:1,
   platform:"web",
   domain:v.domain,
   elapsedSeconds:v.elapsedSeconds,
   interactions:v.interactionCount,
   scrolls:v.scrollCount
  });
  return sample.platform==="web"&&typeof sample.domain==="string";
 }catch{return false}
}

function isInterventionResponse(value:unknown):value is {type:"INTERVENTION_RESPONSE";intervention:string;outcome:"continued"|"exited"}{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="INTERVENTION_RESPONSE"&&typeof v.intervention==="string"&&v.intervention.length<=32&&(v.outcome==="continued"||v.outcome==="exited");
}
