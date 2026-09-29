import {assessAttention,chooseIntervention} from "@attention-firewall/attention-engine";

interface LocalIntent{label:string;targetDomains:string[];startedAt:number}
interface LocalProfile{successByIntervention:Record<string,number>;attemptsByIntervention:Record<string,number>}
interface Session{
  startedAt:number;domain:string;passiveSeconds:number;recentReopens:number;
  interactionCount:number;scrollCount:number;elapsedReported:number;lastInterventionAt:number;
}

const sessions=new Map<number,Session>();

chrome.tabs.onRemoved.addListener(tabId=>sessions.delete(tabId));

chrome.tabs.onActivated.addListener(async({tabId})=>{
  const tab=await chrome.tabs.get(tabId);
  if(!tab.url)return;
  const domain=safeDomain(tab.url);
  let session=sessions.get(tabId);
  if(!session){
    session={startedAt:Date.now(),domain,passiveSeconds:0,recentReopens:0,interactionCount:0,scrollCount:0,elapsedReported:0,lastInterventionAt:0};
    sessions.set(tabId,session);
  }else if(session.domain!==domain){
    session.recentReopens=Math.min(session.recentReopens+1,20);
    session.domain=domain;session.startedAt=Date.now();session.passiveSeconds=0;
    session.interactionCount=0;session.scrollCount=0;session.elapsedReported=0;
  }
  await evaluate(tabId,session);
});

chrome.runtime.onMessage.addListener((message:unknown,sender)=>{
  if(sender.tab?.id===undefined)return;
  const session=sessions.get(sender.tab.id);
  if(!session)return;

  if(isActivityMessage(message)){
    session.scrollCount=Math.min(session.scrollCount+message.scrollCount,1000);
    session.interactionCount=Math.min(session.interactionCount+message.interactionCount,1000);
    session.elapsedReported=Math.min(session.elapsedReported+message.elapsedSeconds,1800);
    if(message.interactionCount===0&&message.scrollCount>0){
      session.passiveSeconds=Math.min(session.passiveSeconds+message.elapsedSeconds,1800);
    }
    void evaluate(sender.tab.id,session);
    return;
  }

  if(isInterventionResponse(message)){
    void recordOutcome(message.intervention,message.outcome);
  }
});

async function evaluate(tabId:number,session:Session){
  if(Date.now()-session.lastInterventionAt<60000)return;
  const stored=await chrome.storage.local.get(["currentIntent","interventionProfile"]);
  const intent=stored.currentIntent as LocalIntent|undefined;
  const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{}};
  const intentDomains=new Set((intent?.targetDomains??[]).map(v=>v.toLowerCase()));
  const outsideIntent=Boolean(intent&&intentDomains.size>0&&!intentDomains.has(session.domain.toLowerCase()));
  const declaredIntentMatch=intentDomains.size===0||intentDomains.has(session.domain.toLowerCase())?1:0;

  const hour=new Date().getHours();
  const lateNightRisk=hour>=22||hour<6?1:0;
  const total=Math.max(1,session.interactionCount+session.scrollCount);
  const interactionRate=Math.min(1,session.interactionCount/total);

  const assessment=assessAttention({
    sessionSeconds:(Date.now()-session.startedAt)/1000,
    repeatedOpens:session.recentReopens,recentReopens:session.recentReopens,
    passiveSeconds:session.passiveSeconds,interactionRate,contextSwitches:0,
    declaredIntentMatch,outsideIntent,lateNightRisk,notificationLaunch:false,previousInterventionIgnored:false
  });
  const decision=chooseIntervention(assessment,{
    successByIntervention:profile.successByIntervention as never,
    attemptsByIntervention:profile.attemptsByIntervention as never
  });
  if(decision.intervention!=="none"){
    session.lastInterventionAt=Date.now();
    await chrome.tabs.sendMessage(tabId,{type:"ATTENTION_INTERVENTION",intervention:decision.intervention}).catch(()=>{});
  }
}

async function recordOutcome(intervention:string,outcome:"continued"|"exited"){
  const stored=await chrome.storage.local.get("interventionProfile");
  const profile=(stored.interventionProfile as LocalProfile|undefined)??{successByIntervention:{},attemptsByIntervention:{}};
  profile.attemptsByIntervention[intervention]=(profile.attemptsByIntervention[intervention]??0)+1;
  if(outcome==="exited")profile.successByIntervention[intervention]=(profile.successByIntervention[intervention]??0)+1;
  await chrome.storage.local.set({interventionProfile:profile});
}

function isActivityMessage(value:unknown):value is {type:"ACTIVITY_SAMPLE";scrollCount:number;interactionCount:number;elapsedSeconds:number}{
  if(!value||typeof value!=="object")return false;
  const v=value as Record<string,unknown>;
  return v.type==="ACTIVITY_SAMPLE" &&
    Number.isSafeInteger(v.scrollCount)&&Number(v.scrollCount)>=0&&Number(v.scrollCount)<=500 &&
    Number.isSafeInteger(v.interactionCount)&&Number(v.interactionCount)>=0&&Number(v.interactionCount)<=500 &&
    typeof v.elapsedSeconds==="number"&&Number.isFinite(v.elapsedSeconds)&&v.elapsedSeconds>=0&&v.elapsedSeconds<=300;
}

function isInterventionResponse(value:unknown):value is {type:"INTERVENTION_RESPONSE";intervention:string;outcome:"continued"|"exited"}{
  if(!value||typeof value!=="object")return false;
  const v=value as Record<string,unknown>;
  return v.type==="INTERVENTION_RESPONSE"&&typeof v.intervention==="string"&&
    (v.outcome==="continued"||v.outcome==="exited")&&String(v.intervention).length<=32;
}

function safeDomain(url:string){
  try{return new URL(url).hostname.replace(/^www\./,"").slice(0,253)}
  catch{return "unknown"}
}
