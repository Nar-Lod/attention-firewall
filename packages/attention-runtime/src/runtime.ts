import {assessAttention,chooseIntervention,detectPassiveScrollLoop} from "@attention-firewall/attention-engine";
import {addDailySeconds,emptyDay,recordDriftEpisode,recordInterventionOutcome,recordInterventionShown,todayKey,type DailySummary} from "@attention-firewall/local-analytics";
import {recommendRecovery} from "@attention-firewall/recovery-engine";
import type {RuntimeConfig,RuntimeDecision,RuntimeSession} from "./types.js";
import {applyPolicy} from "@attention-firewall/policy-engine";
import {budgetStatus,matchDomain,type IntentEnvelope} from "@attention-firewall/intent-engine";

const sessionTimeoutMs=5*60_000;

export class AttentionRuntime{
 private session:RuntimeSession|null=null;
 private summary:DailySummary;

 constructor(private readonly config:RuntimeConfig,private readonly clock:{now():number}={now:()=>Date.now()},initialSummary:DailySummary=emptyDay()){
  this.summary=initialSummary.date===todayKey()?initialSummary:emptyDay();
 }

 setConfig(config:Partial<RuntimeConfig>){
  Object.assign(this.config,config);
 }

 reopen(){
  if(this.session){
   this.session.recentReopens=Math.min(this.session.recentReopens+1,20);
   this.session.lastActivityAt=this.clock.now();
  }
 }

 setSummary(summary:DailySummary){
  this.summary=summary.date===todayKey()?summary:emptyDay();
 }

 getSummary():DailySummary{return this.summary;}

 getInterventionProfile(){
  return {
   successByIntervention:{...this.config.profile.successByIntervention},
   attemptsByIntervention:{...this.config.profile.attemptsByIntervention}
  };
 }

 getInterventionProfile(){
  return {
   successByIntervention:{...this.config.profile.successByIntervention},
   attemptsByIntervention:{...this.config.profile.attemptsByIntervention}
  };
}

 begin(target:string):RuntimeSession{
  const now=this.clock.now();
  this.session={
   id:target+"_"+now.toString(36),startedAt:now,lastActivityAt:now,elapsedSeconds:0,passiveSeconds:0,
   recentReopens:0,interactionCount:0,scrollCount:0,contextSwitches:0,intentMatch:1,
   outsideIntent:false,lateNightRisk:0,notificationLaunch:false,previousInterventionIgnored:false,state:"active"
  };
  return this.session;
 }

 sample(sample:{elapsedSeconds:number;interactions:number;scrolls:number;domain?:string;intentMatch?:number;outsideIntent?:boolean;scrollBursts?:number;scrollDirectionChanges?:number;scrollDistancePerMinute?:number;contextSwitches?:number;notificationLaunch?:boolean;lateNightRisk?:number}):RuntimeDecision{
  if(!this.session)this.begin("local");
  const session=this.session!;
  const now=this.clock.now();
  const elapsed=Math.max(0,Math.min(sample.elapsedSeconds,300));

  session.elapsedSeconds=Math.min(session.elapsedSeconds+elapsed,86_400);
  session.lastActivityAt=now;
  session.interactionCount=Math.min(session.interactionCount+Math.max(0,Math.min(sample.interactions,500)),10_000);
  session.scrollCount=Math.min(session.scrollCount+Math.max(0,Math.min(sample.scrolls,500)),10_000);
  session.contextSwitches=Math.min(session.contextSwitches+Math.max(0,Math.min(sample.contextSwitches??0,50)),1_000);
  const intent=this.config.intent as IntentEnvelope|undefined;
  const intentResult=sample.domain?matchDomain(intent,sample.domain):undefined;
  session.intentMatch=sample.intentMatch??(intentResult?.confidence??1);
  session.outsideIntent=sample.outsideIntent??(intentResult?!intentResult.matches:false);
  session.notificationLaunch=Boolean(sample.notificationLaunch);
  session.lateNightRisk=Math.max(0,Math.min(sample.lateNightRisk??0,1));

  if(sample.interactions===0&&sample.scrolls>0){
   session.passiveSeconds=Math.min(session.passiveSeconds+elapsed,session.elapsedSeconds);
  }

  const total=Math.max(1,session.interactionCount+session.scrollCount);
  const interactionRate=Math.min(1,session.interactionCount/total);
  const scrollEventsPerMinute=Math.min(120,session.scrollCount/Math.max(1,session.elapsedSeconds/60));

  const passiveLoop=detectPassiveScrollLoop({
   sessionSeconds:session.elapsedSeconds,repeatedOpens:session.recentReopens,recentReopens:session.recentReopens,
   passiveSeconds:session.passiveSeconds,interactionRate,scrollEventsPerMinute,scrollBursts:sample.scrollBursts,scrollDirectionChanges:sample.scrollDirectionChanges,scrollDistancePerMinute:sample.scrollDistancePerMinute,
   contextSwitches:session.contextSwitches,declaredIntentMatch:session.intentMatch,
   outsideIntent:session.outsideIntent,lateNightRisk:session.lateNightRisk,
   notificationLaunch:session.notificationLaunch,previousInterventionIgnored:session.previousInterventionIgnored
  });
  let assessment=assessAttention({
   sessionSeconds:session.elapsedSeconds,repeatedOpens:session.recentReopens,recentReopens:session.recentReopens,
   passiveSeconds:session.passiveSeconds,interactionRate,scrollEventsPerMinute,
   contextSwitches:session.contextSwitches,declaredIntentMatch:session.intentMatch,
   outsideIntent:session.outsideIntent,lateNightRisk:session.lateNightRisk,
   notificationLaunch:session.notificationLaunch,previousInterventionIgnored:session.previousInterventionIgnored
  });
  if(passiveLoop.detected){
   assessment={
    ...assessment,
    score:Math.max(assessment.score,0.45),
    state:assessment.score<0.45?"drifting":assessment.state,
    reasons:[...new Set([...assessment.reasons,"passive scroll loop detected"])]
   };
  }

  const cooldownActive=session.lastInterventionAt!==undefined&&now-session.lastInterventionAt<60_000;
  let selected=chooseIntervention(assessment,this.config.profile,now,{strict:this.config.protectionMode==="strict"});
  const currentHour=new Date(now).getHours();
  const twin=this.config.attentionTwin;
  const preemptive=twin!==undefined&&twin.sampleDays>=7&&twin.highRiskHours.includes(currentHour)&&session.elapsedSeconds>=300&&assessment.score>=0.20;
  if(preemptive&&selected.intervention==="none"){
   selected={...selected,intervention:"awareness",reason:"Local Attention Twin indicates a high-risk attention window."};
  }
  const policyIntervention=applyPolicy(selected.intervention,this.config.rules,{domain:sample.domain??"web",minuteOfDay:currentHour*60+new Date(now).getMinutes()});
  const intervention=cooldownActive?"none":policyIntervention;

  if(intervention!=="none")session.lastInterventionAt=now;

  let day=this.summary.date===todayKey()?this.summary:emptyDay();
  day=sample.interactions===0&&sample.scrolls>0
   ?addDailySeconds(day,"passiveSeconds",elapsed)
   :addDailySeconds(day,"intentionalSeconds",sample.outsideIntent?0:elapsed);
  if(intervention!=="none"){day=recordDriftEpisode(day,currentHour);day=recordInterventionShown(day);}
  this.summary=day;

  const recovery=recommendRecovery({
   minutesRecovered:Math.max(2,Math.round(elapsed/60)),
   intentPurpose:this.config.intent?.purpose??"other",
   timeOfDay:timeOfDay(new Date(now)),
   consecutiveDriftEpisodes:day.driftEpisodes
  });

  return {session,assessment,intervention,recoveryMinutes:recovery[0]?.durationMinutes??2,dailySummary:day};
 }

 respond(intervention:string,outcome:"continued"|"exited"){
  this.config.profile.attemptsByIntervention[intervention]=(this.config.profile.attemptsByIntervention[intervention]??0)+1;
  if(outcome==="exited")this.config.profile.successByIntervention[intervention]=(this.config.profile.successByIntervention[intervention]??0)+1;
  this.summary=recordInterventionOutcome(this.summary,outcome==="exited");
  if(outcome==="continued"&&this.session)this.session.previousInterventionIgnored=true;
 }

 complete(){if(this.session)this.session.state="completed";}

 isTimedOut(now=this.clock.now()):boolean{
  return this.session!==null&&now-this.session.lastActivityAt>sessionTimeoutMs;
 }
}

function timeOfDay(date:Date):"morning"|"day"|"evening"|"night"{
 const hour=date.getHours();
 if(hour<7)return "morning";
 if(hour<17)return "day";
 if(hour<22)return "evening";
 return "night";
}
