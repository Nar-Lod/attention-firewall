import {AttentionRuntime} from "@attention-firewall/attention-runtime";

interface LocalIntent{label:string;targetDomains:string[];startedAt:number;purpose?:"work"|"study"|"communication"|"entertainment"|"rest"|"other"}
interface LocalProfile{successByIntervention:Record<string,number>;attemptsByIntervention:Record<string,number>}
interface ActivitySample{type:"ACTIVITY_SAMPLE";scrollCount:number;interactionCount:number;elapsedSeconds:number;domain:string}
interface SessionRuntimeState{domain:string;runtime:AttentionRuntime;lastInterventionAt:number}

const runtimes=new Map<number,SessionRuntimeState>();

chrome.runtime.onMessage.addListener((message:unknown,sender)=>{
 if(sender.tab?.id===undefined)return;
 if(isActivityMessage(message)){
  void handleActivity(sender.tab.id,message);
  return;
 }
 if(isInterventionResponse(message)){
  void handleResponse(message.intervention,message.outcome);
 }
});

async function handleActivity(tabId:number,message:ActivitySample){
 const state=runtimes.get(tabId);
 const stored=await chrome.storage.local.get(["currentIntent","interventionProfile","protectionMode","dailySummary"]);
 const intent=stored.currentIntent as LocalIntent|undefined;
 const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{}};
 const protectionMode=stored.protectionMode==="strict"?"strict":"adaptive";

 let current=state;
 if(!current||current.domain!==message.domain){
  current={domain:message.domain,lastInterventionAt:0,runtime:new AttentionRuntime({
   protectionMode,
   profile,
   intent:intent?{
    id:intent.startedAt.toString(36),label:intent.label,purpose:intent.purpose??"other",
    targetDomains:intent.targetDomains,startedAt:intent.startedAt
   }:undefined
  })};
  runtimes.set(tabId,current);
  current.runtime.begin(message.domain);
 }

 const allowed=new Set((intent?.targetDomains??[]).map(v=>v.toLowerCase()));
 const outsideIntent=Boolean(intent&&allowed.size>0&&!allowed.has(message.domain.toLowerCase()));
 const intentMatch=!intent||allowed.size===0||allowed.has(message.domain.toLowerCase())?1:0;
 const hour=new Date().getHours();
 const result=current.runtime.sample({
  elapsedSeconds:message.elapsedSeconds,
  interactions:message.interactionCount,
  scrolls:message.scrollCount,
  intentMatch,
  outsideIntent,
  lateNightRisk:hour>=22||hour<6?1:0
 });

 await chrome.storage.local.set({dailySummary:result.dailySummary});

 if(result.intervention!=="none"&&Date.now()-current.lastInterventionAt>=60_000){
  current.lastInterventionAt=Date.now();
  await chrome.tabs?.sendMessage?.(tabId,{type:"ATTENTION_INTERVENTION",intervention:result.intervention}).catch(()=>{});
 }
}

async function handleResponse(intervention:string,outcome:"continued"|"exited"){
 const stored=await chrome.storage.local.get(["interventionProfile","dailySummary"]);
 const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{}};
 profile.attemptsByIntervention[intervention]=(profile.attemptsByIntervention[intervention]??0)+1;
 if(outcome==="exited")profile.successByIntervention[intervention]=(profile.successByIntervention[intervention]??0)+1;
 await chrome.storage.local.set({interventionProfile:profile});

 for(const state of runtimes.values())state.runtime.respond(intervention,outcome);
 void stored.dailySummary;
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
