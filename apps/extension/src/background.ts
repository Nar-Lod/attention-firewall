import {assessAttention,chooseIntervention} from "@attention-firewall/attention-engine";
import {addDailySeconds,emptyDay,recordDriftEpisode,recordIntervention,todayKey} from "@attention-firewall/local-analytics";

interface LocalIntent{label:string;targetDomains:string[];startedAt:number}
interface LocalProfile{successByIntervention:Record<string,number>;attemptsByIntervention:Record<string,number>}
interface Session{startedAt:number;domain:string;passiveSeconds:number;recentReopens:number;interactionCount:number;scrollCount:number;elapsedReported:number;lastInterventionAt:number}
interface ActivitySample{type:"ACTIVITY_SAMPLE";scrollCount:number;interactionCount:number;elapsedSeconds:number;domain:string}

const sessions=new Map<number,Session>();

chrome.tabs.onRemoved.addListener(tabId=>sessions.delete(tabId));

chrome.runtime.onMessage.addListener((message:unknown,sender)=>{
 if(sender.tab?.id===undefined)return;

 if(isActivityMessage(message)){
  const session=getOrCreateSession(sender.tab.id,message.domain);
  if(session.domain!==message.domain){
   session.recentReopens=Math.min(session.recentReopens+1,20);
   session.domain=message.domain;session.startedAt=Date.now();session.passiveSeconds=0;
   session.interactionCount=0;session.scrollCount=0;session.elapsedReported=0;
  }
  session.scrollCount=Math.min(session.scrollCount+message.scrollCount,1000);
  session.interactionCount=Math.min(session.interactionCount+message.interactionCount,1000);
  session.elapsedReported=Math.min(session.elapsedReported+message.elapsedSeconds,1800);
  if(message.interactionCount===0&&message.scrollCount>0)session.passiveSeconds=Math.min(session.passiveSeconds+message.elapsedSeconds,1800);
  void recordSampleAnalytics(message.domain,message.elapsedSeconds,message.interactionCount,message.scrollCount);
  void evaluate(sender.tab.id,session);
  return;
 }

 if(isInterventionResponse(message))void recordOutcome(message.intervention,message.outcome);
});

function getOrCreateSession(tabId:number,domain:string):Session{
 let session=sessions.get(tabId);
 if(!session){
  session={startedAt:Date.now(),domain,passiveSeconds:0,recentReopens:0,interactionCount:0,scrollCount:0,elapsedReported:0,lastInterventionAt:0};
  sessions.set(tabId,session);
 }
 return session;
}

async function evaluate(tabId:number,session:Session){
 if(Date.now()-session.lastInterventionAt<60000)return;
 const stored=await chrome.storage.local.get(["currentIntent","interventionProfile","protectionMode"]);
 const intent=stored.currentIntent as LocalIntent|undefined;
 const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{}};
 const strict=(stored.protectionMode as string|undefined)==="strict";
 const intentDomains=new Set((intent?.targetDomains??[]).map(v=>v.toLowerCase()));
 const outsideIntent=Boolean(intent&&intentDomains.size>0&&!intentDomains.has(session.domain.toLowerCase()));
 const declaredIntentMatch=!intent||intentDomains.size===0||intentDomains.has(session.domain.toLowerCase())?1:0;
 const hour=new Date().getHours();
 const lateNightRisk=hour>=22||hour<6?1:0;
 const total=Math.max(1,session.interactionCount+session.scrollCount);
 const interactionRate=Math.min(1,session.interactionCount/total);
 const scrollEventsPerMinute=Math.min(120,(session.scrollCount/Math.max(1,(Date.now()-session.startedAt)/60000)));

 const assessment=assessAttention({
  sessionSeconds:(Date.now()-session.startedAt)/1000,
  repeatedOpens:session.recentReopens,recentReopens:session.recentReopens,
  passiveSeconds:session.passiveSeconds,interactionRate,scrollEventsPerMinute,contextSwitches:0,
  declaredIntentMatch,outsideIntent,lateNightRisk,notificationLaunch:false,previousInterventionIgnored:false
 });
 const decision=chooseIntervention(assessment,{successByIntervention:profile.successByIntervention,attemptsByIntervention:profile.attemptsByIntervention},Date.now(),{strict});
 if(decision.intervention!=="none"){
  session.lastInterventionAt=Date.now();
  void recordInterventionShown();
  await chrome.tabs.sendMessage(tabId,{type:"ATTENTION_INTERVENTION",intervention:decision.intervention}).catch(()=>{});
 }
}

async function recordOutcome(intervention:string,outcome:"continued"|"exited"){
 const stored=await chrome.storage.local.get(["interventionProfile","dailySummary"]);
 const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{}};
 profile.attemptsByIntervention[intervention]=(profile.attemptsByIntervention[intervention]??0)+1;
 if(outcome==="exited")profile.successByIntervention[intervention]=(profile.successByIntervention[intervention]??0)+1;
 let summary=stored.dailySummary as ReturnType<typeof emptyDay>|undefined;
 summary=summary&&summary.date===todayKey()?summary:emptyDay();
 summary=recordIntervention(summary,outcome==="exited");
 await chrome.storage.local.set({interventionProfile:profile,dailySummary:summary});
}

async function recordSampleAnalytics(domain:string,seconds:number,interactions:number,scrolls:number){
 const stored=await chrome.storage.local.get(["currentIntent","dailySummary"]);
 const intent=stored.currentIntent as LocalIntent|undefined;
 const allowed=new Set((intent?.targetDomains??[]).map(v=>v.toLowerCase()));
 const outside=Boolean(intent&&allowed.size>0&&!allowed.has(domain.toLowerCase()));
 let summary=stored.dailySummary as ReturnType<typeof emptyDay>|undefined;
 summary=summary&&summary.date===todayKey()?summary:emptyDay();
 if(scrolls>0&&interactions===0)summary=addDailySeconds(summary,"passiveSeconds",seconds);
 else if(!outside)summary=addDailySeconds(summary,"intentionalSeconds",seconds);
 await chrome.storage.local.set({dailySummary:summary});
}

async function recordInterventionShown(){
 const stored=await chrome.storage.local.get("dailySummary");
 let summary=stored.dailySummary as ReturnType<typeof emptyDay>|undefined;
 summary=summary&&summary.date===todayKey()?summary:emptyDay();
 summary=recordDriftEpisode(summary);
 await chrome.storage.local.set({dailySummary:summary});
}

function isActivityMessage(value:unknown):value is ActivitySample{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="ACTIVITY_SAMPLE"&&typeof v.domain==="string"&&v.domain.length>=1&&v.domain.length<=253&&
  Number.isSafeInteger(v.scrollCount)&&Number(v.scrollCount)>=0&&Number(v.scrollCount)<=500&&
  Number.isSafeInteger(v.interactionCount)&&Number(v.interactionCount)>=0&&Number(v.interactionCount)<=500&&
  typeof v.elapsedSeconds==="number"&&Number.isFinite(v.elapsedSeconds)&&v.elapsedSeconds>=0&&v.elapsedSeconds<=300;
}

function isInterventionResponse(value:unknown):value is {type:"INTERVENTION_RESPONSE";intervention:string;outcome:"continued"|"exited"}{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="INTERVENTION_RESPONSE"&&typeof v.intervention==="string"&&v.intervention.length<=32&&(v.outcome==="continued"||v.outcome==="exited");
}
