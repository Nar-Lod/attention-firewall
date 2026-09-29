import {AttentionRuntime} from "@attention-firewall/attention-runtime";
import {DEFAULT_HISTORY,emptyDay,recordIntervention,pruneHistory,upsertDay,type DailyHistory} from "@attention-firewall/local-analytics";

interface LocalIntent{label:string;targetDomains:string[];startedAt:number;purpose?:"work"|"study"|"communication"|"entertainment"|"rest"|"other";budgetMinutes?:number}
interface LocalProfile{successByIntervention:Record<string,number>;attemptsByIntervention:Record<string,number>}
interface ActivitySample{type:"ACTIVITY_SAMPLE";scrollCount:number;interactionCount:number;elapsedSeconds:number;domain:string}
interface SessionRuntimeState{domain:string;runtime:AttentionRuntime;lastInterventionAt:number}

const CONTENT_SCRIPT_ID="attention-firewall-local-detector";
const runtimes=new Map<number,SessionRuntimeState>();

chrome.runtime.onInstalled.addListener(()=>void syncProtection());
chrome.runtime.onStartup.addListener(()=>void syncProtection());
chrome.permissions.onAdded.addListener(()=>void syncProtection());
chrome.permissions.onRemoved.addListener(()=>void handlePermissionRemoved());

chrome.runtime.onMessage.addListener((message:unknown,sender)=>{
 if(messageType(message)==="ENABLE_WEB_PROTECTION"){
  void enableWebProtection();
  return;
 }
 if(messageType(message)==="DISABLE_WEB_PROTECTION"){
  void disableWebProtection();
  return;
 }
 if(sender.tab?.id===undefined)return;

 if(isActivityMessage(message)){
  void handleActivity(sender.tab.id,message);
  return;
 }
 if(isInterventionResponse(message)){
  void handleResponse(message.intervention,message.outcome);
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
 const granted=await chrome.permissions.request({origins:["https://*/*"]});
 if(!granted){
  await chrome.storage.local.set({webProtectionEnabled:false});
  return;
 }
 await chrome.storage.local.set({webProtectionEnabled:true});
 await registerDetector();
}

async function disableWebProtection(){
 await unregisterDetector();
 await chrome.storage.local.set({webProtectionEnabled:false});
 runtimes.clear();
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
 const stored=await chrome.storage.local.get(["currentIntent","interventionProfile","protectionMode","dailySummary","dailyHistory"]);
 const intent=stored.currentIntent as LocalIntent|undefined;
 const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{}};
 const protectionMode=stored.protectionMode==="strict"?"strict":"adaptive";

 let current=state;
 if(!current||current.domain!==message.domain){
  current={domain:message.domain,lastInterventionAt:0,runtime:new AttentionRuntime({
   protectionMode,
   profile,
   intent:intent?{
    id:intent.startedAt.toString(36),
    label:intent.label,
    purpose:intent.purpose??"other",
    targetDomains:intent.targetDomains,
    startedAt:intent.startedAt,
    budgetMinutes:intent.budgetMinutes
   }:undefined
  },undefined,typeof stored.dailySummary==="object"&&stored.dailySummary?stored.dailySummary:undefined)};
  runtimes.set(tabId,current);
  current.runtime.begin(message.domain);
 }

 current.runtime.setConfig({
  protectionMode,
  profile,
  intent:intent?{
   id:intent.startedAt.toString(36),label:intent.label,purpose:intent.purpose??"other",
   targetDomains:intent.targetDomains,startedAt:intent.startedAt,budgetMinutes:intent.budgetMinutes
  }:undefined
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
  lateNightRisk:hour>=22||hour<6?1:0
 });

 const existingHistory=stored.dailyHistory as DailyHistory|undefined;
 const nextHistory=pruneHistory(upsertDay(existingHistory?.version===1?existingHistory:DEFAULT_HISTORY,result.dailySummary),30);
 await chrome.storage.local.set({dailySummary:result.dailySummary,dailyHistory:nextHistory});

 if(result.intervention!=="none"&&Date.now()-current.lastInterventionAt>=60_000){
  current.lastInterventionAt=Date.now();
  await chrome.tabs.sendMessage(tabId,{type:"ATTENTION_INTERVENTION",intervention:result.intervention}).catch(()=>{});
 }
}

async function handleResponse(intervention:string,outcome:"continued"|"exited"){
 const stored=await chrome.storage.local.get(["interventionProfile","dailySummary","dailyHistory"]);
 const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{}};
 profile.attemptsByIntervention[intervention]=(profile.attemptsByIntervention[intervention]??0)+1;
 if(outcome==="exited")profile.successByIntervention[intervention]=(profile.successByIntervention[intervention]??0)+1;

 for(const state of runtimes.values())state.runtime.respond(intervention,outcome);
 let summary=stored.dailySummary as ReturnType<typeof emptyDay>|undefined;
 summary=summary&&summary.date===new Date().toISOString().slice(0,10)?summary:emptyDay();
 summary=recordIntervention(summary,outcome==="exited");
 const existingHistory=stored.dailyHistory as DailyHistory|undefined;
 const nextHistory=pruneHistory(upsertDay(existingHistory?.version===1?existingHistory:DEFAULT_HISTORY,summary),30);
 await chrome.storage.local.set({interventionProfile:profile,dailySummary:summary,dailyHistory:nextHistory});
}

function messageType(value:unknown):string{
 if(!value||typeof value!=="object")return "";
 const type=(value as Record<string,unknown>).type;
 return typeof type==="string"&&type.length<=64?type:"";
}

function isActivityMessage(value:unknown):value is ActivitySample{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="ACTIVITY_SAMPLE"&&typeof v.domain==="string"&&v.domain.length>=1&&v.domain.length<=253&&
  Number.isSafeInteger(v.scrollCount)&&v.scrollCount>=0&&v.scrollCount<=500&&
  Number.isSafeInteger(v.interactionCount)&&v.interactionCount>=0&&v.interactionCount<=500&&
  typeof v.elapsedSeconds==="number"&&Number.isFinite(v.elapsedSeconds)&&v.elapsedSeconds>=0&&v.elapsedSeconds<=300;
}

function isInterventionResponse(value:unknown):value is {type:"INTERVENTION_RESPONSE";intervention:string;outcome:"continued"|"exited"}{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="INTERVENTION_RESPONSE"&&typeof v.intervention==="string"&&v.intervention.length<=32&&(v.outcome==="continued"||v.outcome==="exited");
}
