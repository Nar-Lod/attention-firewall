import {assessAttention,chooseIntervention} from "@attention-firewall/attention-engine";

type LocalSession={startedAt:number;domain:string;passiveSeconds:number;recentReopens:number;interactionRate:number};
const sessions=new Map<number,LocalSession>();

chrome.tabs.onActivated.addListener(async ({tabId})=>{
 const tab=await chrome.tabs.get(tabId);
 if(!tab.url)return;
 const domain=safeDomain(tab.url);
 const current=sessions.get(tabId);
 if(!current)sessions.set(tabId,{startedAt:Date.now(),domain,passiveSeconds:0,recentReopens:0,interactionRate:.2});
 else if(current.domain!==domain){current.recentReopens++;current.domain=domain;}
 const s=sessions.get(tabId)!;
 const a=assessAttention({
   sessionSeconds:(Date.now()-s.startedAt)/1000,
   repeatedOpens:s.recentReopens,recentReopens:s.recentReopens,passiveSeconds:s.passiveSeconds,
   interactionRate:s.interactionRate,contextSwitches:0,declaredIntentMatch:1,outsideIntent:false,
   lateNightRisk:0,notificationLaunch:false,previousInterventionIgnored:false
 });
 const d=chooseIntervention(a,{successByIntervention:{},attemptsByIntervention:{}});
 if(d.intervention!=="none"){
   await chrome.tabs.sendMessage(tabId,{type:"ATTENTION_INTERVENTION",intervention:d.intervention,score:d.score}).catch(()=>{});
 }
});

function safeDomain(url:string){try{return new URL(url).hostname.replace(/^www\./,"")}catch{return "unknown"}}
