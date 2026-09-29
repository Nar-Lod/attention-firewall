import {AttentionRuntime} from "@attention-firewall/attention-runtime";
import {parseCommitments,parseInterventionProfile} from "@attention-firewall/local-store";
import {sanitizeIntent,type IntentEnvelope} from "@attention-firewall/intent-engine";
import {validateRuntimeInterventionResponse,validateRuntimeRecoveryCompleted,validateRuntimeSample,validateRuntimeSessionStart} from "@attention-firewall/runtime-protocol";
import {buildAttentionTwin} from "@attention-firewall/personalization-engine";
import {validateRules,type PolicyRule} from "@attention-firewall/policy-engine";
import {appendSecurityEvent,clearLocalState,getLocalState,setLocalState} from "./local-state.js";
import {hostPatterns} from "./host-permissions.js";
import {DEFAULT_HISTORY,addDailySeconds,emptyDay,recordInterventionOutcome,pruneHistory,upsertDay,type DailyHistory} from "@attention-firewall/local-analytics";

interface ActivitySample{type:"ACTIVITY_SAMPLE";protocolVersion:1;scrollCount:number;interactionCount:number;elapsedSeconds:number;domain:string;scrollBursts?:number;scrollDirectionChanges?:number;scrollDistancePerMinute?:number}
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
  void handleResponse(sender.tab.id,message.intervention,message.outcome);
  return;
 }
 if(isRecoveryCompleted(message)){
  void handleRecovery(sender.tab.id,message.durationSeconds);
 }
});

async function syncProtection(){
 const state=await getLocalState();
 const enabled=(await chrome.storage.local.get("webProtectionEnabled")).webProtectionEnabled===true;
 const patterns=hostPatterns(state.currentIntent?.targetDomains??[]);
 const granted=patterns.length>0&&await chrome.permissions.contains({origins:patterns});
 if(enabled&&granted){
  await registerDetector(patterns);
 }else if(enabled){
  await chrome.storage.local.set({webProtectionEnabled:false});
  await unregisterDetector();
 }
}

async function enableWebProtection(){
 const state=await getLocalState();
 const patterns=hostPatterns(state.currentIntent?.targetDomains??[]);
 const granted=patterns.length>0&&await chrome.permissions.contains({origins:patterns});
 if(!granted){
  await chrome.storage.local.set({webProtectionEnabled:false});
  return;
 }
 await chrome.storage.local.set({webProtectionEnabled:true});
 await appendSecurityEvent("permission_changed","success");
 await registerDetector(patterns);
}

async function disableWebProtection(){
 const state=await getLocalState();
 const patterns=hostPatterns(state.currentIntent?.targetDomains??[]);
 await unregisterDetector();
 if(patterns.length>0)await chrome.permissions.remove({origins:patterns}).catch(()=>false);
 await chrome.storage.local.set({webProtectionEnabled:false});
 await appendSecurityEvent("permission_changed","success");
 runtimes.clear();
 pendingRecovery.clear();
}

async function clearLocalData(){
 const state=await getLocalState();
 const patterns=hostPatterns(state.currentIntent?.targetDomains??[]);
 await unregisterDetector();
 if(patterns.length>0)await chrome.permissions.remove({origins:patterns}).catch(()=>false);
 await chrome.storage.local.remove("webProtectionEnabled");
 await clearLocalState();
 runtimes.clear();
 pendingRecovery.clear();
}

async function handlePermissionRemoved(){
 const current=await chrome.storage.local.get("webProtectionEnabled");
 if(current.webProtectionEnabled===true){
  await chrome.storage.local.set({webProtectionEnabled:false});
  await appendSecurityEvent("permission_changed","success");
 }
 await unregisterDetector();
 runtimes.clear();
}

async function registerDetector(patterns:string[]){
 const existing=await chrome.scripting.getRegisteredContentScripts({ids:[CONTENT_SCRIPT_ID]});
 if(existing.length>0)await unregisterDetector();
 if(patterns.length===0)return;
 await chrome.scripting.registerContentScripts([{
  id:CONTENT_SCRIPT_ID,
  matches:patterns,
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
 const stored=await getLocalState();
 const intent=sanitizeIntent(stored.currentIntent);
 const profile=parseInterventionProfile(stored.interventionProfile);
 const savedHistory=stored.dailyHistory;
 const commitments=parseCommitments(stored.commitments);
 const attentionTwin=buildAttentionTwin(savedHistory?.version===1?savedHistory.days:[],profile);
 const protectionMode=stored.protectionMode==="strict"?"strict":"adaptive";

 let current=state;
 if(!current){
  current={domain:message.domain,lastInterventionAt:0,contextSwitches:0,runtime:new AttentionRuntime({
   protectionMode,
   profile,
   rules:safeRules(stored.rules),
   attentionTwin,
   commitments:parseCommitments(stored.commitments),
   ...(intent?{intent}: {})
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
  commitments:parseCommitments(stored.commitments),
  ...(intent?{intent}: {})
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
  lateNightRisk:hour>=22||hour<6?1:0,
  ...(message.scrollBursts===undefined?{}:{scrollBursts:message.scrollBursts}),
  ...(message.scrollDirectionChanges===undefined?{}:{scrollDirectionChanges:message.scrollDirectionChanges}),
  ...(message.scrollDistancePerMinute===undefined?{}:{scrollDistancePerMinute:message.scrollDistancePerMinute})
 });

 const existingHistory=stored.dailyHistory;
 const nextHistory=pruneHistory(upsertDay(existingHistory?.version===1?existingHistory:DEFAULT_HISTORY,result.dailySummary),30);
 await setLocalState({dailySummary:result.dailySummary,dailyHistory:nextHistory});

 if(result.intervention!=="none"&&Date.now()-current.lastInterventionAt>=60_000){
  current.lastInterventionAt=Date.now();
  await chrome.tabs.sendMessage(tabId,{type:"ATTENTION_INTERVENTION",intervention:result.intervention,recoveryMinutes:result.recoveryMinutes}).catch(()=>{});
 }
}

async function handleResponse(tabId:number,intervention:string,outcome:"continued"|"exited"){
 const stored=await getLocalState();
 const profile=parseInterventionProfile(stored.interventionProfile);
 profile.attemptsByIntervention[intervention]=(profile.attemptsByIntervention[intervention]??0)+1;
 if(outcome==="exited")profile.successByIntervention[intervention]=(profile.successByIntervention[intervention]??0)+1;

 const state=runtimes.get(tabId); if(state)state.runtime.respond(intervention,outcome);
 let summary=stored.dailySummary as ReturnType<typeof emptyDay>|undefined;
 summary=summary&&summary.date===new Date().toISOString().slice(0,10)?summary:emptyDay();
 summary=recordInterventionOutcome(summary,outcome==="exited");
 const existingHistory=stored.dailyHistory;
 const nextHistory=pruneHistory(upsertDay(existingHistory?.version===1?existingHistory:DEFAULT_HISTORY,summary),30);
 await setLocalState({interventionProfile:profile,dailySummary:summary,dailyHistory:nextHistory});
}

async function handleSessionStart(tabId:number,message:SessionStart){
 const stored=await getLocalState();
 const intent=sanitizeIntent(stored.currentIntent);
 const profile=parseInterventionProfile(stored.interventionProfile);
 const commitments=parseCommitments(stored.commitments);
 const savedHistory=stored.dailyHistory;
 const attentionTwin=buildAttentionTwin(savedHistory?.version===1?savedHistory.days:[],profile);
 const protectionMode=stored.protectionMode==="strict"?"strict":"adaptive";
 let state=runtimes.get(tabId);
 if(!state){
  state={domain:message.domain,lastInterventionAt:0,contextSwitches:0,runtime:new AttentionRuntime({
   protectionMode,profile,rules:safeRules(stored.rules),attentionTwin,commitments,...(intent?{intent}: {})
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
 try{
  if(!value||typeof value!=="object")return false;
  const v=value as Record<string,unknown>;
  if(v.type!=="SESSION_START")return false;
  validateRuntimeSessionStart({
   protocolVersion:v.protocolVersion,
   eventKind:"session-start",
   platform:"web",
   domain:v.domain
  });
  return true;
 }catch{return false}
}

function safeRules(value:unknown):PolicyRule[]{try{return validateRules(value)}catch{return []}}

async function handleRecovery(tabId:number,durationSeconds:number){
 const pending=pendingRecovery.get(tabId);
 if(!pending||Date.now()-pending.startedAt>60_000){pendingRecovery.delete(tabId);return;}
 const bounded=Math.max(120,Math.min(durationSeconds,600));
 const stored=await getLocalState();
 let summary=stored.dailySummary as ReturnType<typeof emptyDay>|undefined;
 summary=summary&&summary.date===new Date().toISOString().slice(0,10)?summary:emptyDay();
 summary=addDailySeconds(summary,"attentionRecoveredSeconds",bounded);
 const existingHistory=stored.dailyHistory;
 const nextHistory=pruneHistory(upsertDay(existingHistory?.version===1?existingHistory:DEFAULT_HISTORY,summary),30);
 pendingRecovery.delete(tabId);
 await setLocalState({dailySummary:summary,dailyHistory:nextHistory});
}

function isRecoveryCompleted(value:unknown):value is {type:"RECOVERY_COMPLETED";durationSeconds:number}{
 try{
  if(!value||typeof value!=="object")return false;
  const v=value as Record<string,unknown>;
  if(v.type!=="RECOVERY_COMPLETED")return false;
  validateRuntimeRecoveryCompleted({
   protocolVersion:1,eventKind:"recovery-completed",platform:"web",
   durationSeconds:v.durationSeconds
  });
  return true;
 }catch{return false}
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
   eventKind:"sample",
   platform:"web",
   domain:v.domain,
   elapsedSeconds:v.elapsedSeconds,
   interactions:v.interactionCount,
   scrolls:v.scrollCount,
   scrollBursts:v.scrollBursts,
   scrollDirectionChanges:v.scrollDirectionChanges,
   scrollDistancePerMinute:v.scrollDistancePerMinute
  });
  return sample.platform==="web"&&typeof sample.domain==="string";
 }catch{return false}
}

function isInterventionResponse(value:unknown):value is {type:"INTERVENTION_RESPONSE";intervention:string;outcome:"continued"|"exited"}{
 try{
  if(!value||typeof value!=="object")return false;
  const v=value as Record<string,unknown>;
  if(v.type!=="INTERVENTION_RESPONSE")return false;
  validateRuntimeInterventionResponse({
   protocolVersion:1,eventKind:"intervention-response",platform:"web",
   intervention:v.intervention,outcome:v.outcome
  });
  return true;
 }catch{return false}
}
