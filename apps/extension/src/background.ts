import {assessAttention,chooseIntervention} from "@attention-firewall/attention-engine";

interface Session {
  startedAt:number;
  domain:string;
  passiveSeconds:number;
  recentReopens:number;
  interactionCount:number;
  scrollCount:number;
  elapsedReported:number;
}

const sessions=new Map<number,Session>();

chrome.tabs.onRemoved.addListener(tabId=>sessions.delete(tabId));

chrome.tabs.onActivated.addListener(async({tabId})=>{
 const tab=await chrome.tabs.get(tabId);
 if(!tab.url)return;
 const domain=safeDomain(tab.url);
 let session=sessions.get(tabId);
 if(!session){
  session={startedAt:Date.now(),domain,passiveSeconds:0,recentReopens:0,interactionCount:0,scrollCount:0,elapsedReported:0};
  sessions.set(tabId,session);
 }else if(session.domain!==domain){
  session.recentReopens=Math.min(session.recentReopens+1,20);
  session.domain=domain;
  session.startedAt=Date.now();
  session.passiveSeconds=0;
  session.interactionCount=0;
  session.scrollCount=0;
  session.elapsedReported=0;
 }
 await evaluate(tabId,session);
});

chrome.runtime.onMessage.addListener((message:unknown,sender)=>{
 if(!isActivityMessage(message)||sender.tab?.id===undefined)return;
 const session=sessions.get(sender.tab.id);
 if(!session)return;
 session.scrollCount=Math.min(session.scrollCount+message.scrollCount,1000);
 session.interactionCount=Math.min(session.interactionCount+message.interactionCount,1000);
 session.elapsedReported=Math.min(session.elapsedReported+message.elapsedSeconds,1800);
 if(message.interactionCount===0&&message.scrollCount>0){
   session.passiveSeconds=Math.min(session.passiveSeconds+message.elapsedSeconds,1800);
 }
 void evaluate(sender.tab.id,session);
});

async function evaluate(tabId:number,session:Session){
 const now=new Date();
 const hour=now.getHours();
 const lateNightRisk=hour>=22||hour<6?1:0;
 const total=Math.max(1,session.interactionCount+session.scrollCount);
 const interactionRate=Math.min(1,session.interactionCount/total);
 const assessment=assessAttention({
  sessionSeconds:(Date.now()-session.startedAt)/1000,
  repeatedOpens:session.recentReopens,
  recentReopens:session.recentReopens,
  passiveSeconds:session.passiveSeconds,
  interactionRate,
  contextSwitches:0,
  declaredIntentMatch:1,
  outsideIntent:false,
  lateNightRisk,
  notificationLaunch:false,
  previousInterventionIgnored:false
 });
 const decision=chooseIntervention(assessment,{successByIntervention:{},attemptsByIntervention:{}});
 if(decision.intervention!=="none"){
  await chrome.tabs.sendMessage(tabId,{type:"ATTENTION_INTERVENTION",intervention:decision.intervention}).catch(()=>{});
 }
}

function isActivityMessage(value:unknown):value is {type:"ACTIVITY_SAMPLE";scrollCount:number;interactionCount:number;elapsedSeconds:number}{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="ACTIVITY_SAMPLE" &&
  Number.isSafeInteger(v.scrollCount)&&Number(v.scrollCount)>=0&&Number(v.scrollCount)<=500 &&
  Number.isSafeInteger(v.interactionCount)&&Number(v.interactionCount)>=0&&Number(v.interactionCount)<=500 &&
  typeof v.elapsedSeconds==="number"&&Number.isFinite(v.elapsedSeconds)&&v.elapsedSeconds>=0&&v.elapsedSeconds<=300;
}

function safeDomain(url:string){
 try{return new URL(url).hostname.replace(/^www\./,"").slice(0,253)}
 catch{return "unknown"}
}
