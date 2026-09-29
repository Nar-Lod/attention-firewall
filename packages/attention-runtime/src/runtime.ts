import {assessAttention,chooseIntervention,detectPassiveScrollLoop} from "@attention-firewall/attention-engine";
import type {Intervention} from "@attention-firewall/attention-engine";
import {addDailySeconds,emptyDay,recordDriftEpisode,recordInterventionOutcome,recordInterventionShown,todayKey,type DailySummary} from "@attention-firewall/local-analytics";
import {recommendRecovery} from "@attention-firewall/recovery-engine";
import type {RuntimeConfig,RuntimeDecision,RuntimeSession} from "./types.js";
import {applyPolicy} from "@attention-firewall/policy-engine";
import {budgetStatus,matchDomain,type IntentEnvelope} from "@attention-firewall/intent-engine";
import {applyCommitments} from "@attention-firewall/commitment-engine";

export interface RuntimeClock {
  now():number;
}

const SESSION_TIMEOUT_MS=5*60_000;
const MAX_SAMPLE_SECONDS=300;

export class AttentionRuntime {
  private session:RuntimeSession|null=null;
  private summary:DailySummary;

  constructor(
    private readonly config:RuntimeConfig,
    private readonly clock:RuntimeClock={now:()=>Date.now()},
    initialSummary:DailySummary=emptyDay()
  ){
    this.summary=initialSummary.date===todayKey()?initialSummary:emptyDay();
  }

  setConfig(config:Partial<RuntimeConfig>){
    Object.assign(this.config,config);
  }

  begin(target:string):RuntimeSession{
    const now=this.clock.now();
    this.session={
      id:target+"_"+now.toString(36),
      startedAt:now,
      lastActivityAt:now,
      elapsedSeconds:0,
      passiveSeconds:0,
      recentReopens:0,
      interactionCount:0,
      scrollCount:0,
      contextSwitches:0,
      intentMatch:1,
      outsideIntent:false,
      lateNightRisk:0,
      notificationLaunch:false,
      previousInterventionIgnored:false,
      state:"active"
    };
    return this.session;
  }

  reopen(){
    if(!this.session){
      this.begin("local");
      return;
    }
    this.session.recentReopens=Math.min(this.session.recentReopens+1,20);
    this.session.lastActivityAt=this.clock.now();
  }

  setSummary(summary:DailySummary){
    this.summary=summary.date===todayKey()?summary:emptyDay();
  }

  getSummary():DailySummary{
    return this.summary;
  }

  getInterventionProfile(){
    return {
      successByIntervention:{...this.config.profile.successByIntervention},
      attemptsByIntervention:{...this.config.profile.attemptsByIntervention}
    };
  }

  isTimedOut(now=this.clock.now()):boolean{
    return this.session!==null&&now-this.session.lastActivityAt>SESSION_TIMEOUT_MS;
  }

  sample(sample:{
    elapsedSeconds:number;
    interactions:number;
    scrolls:number;
    domain?:string;
    intentMatch?:number;
    outsideIntent?:boolean;
    scrollBursts?:number;
    scrollDirectionChanges?:number;
    scrollDistancePerMinute?:number;
    contextSwitches?:number;
    notificationLaunch?:boolean;
    lateNightRisk?:number;
  }):RuntimeDecision{
    if(!this.session)this.begin("local");
    const session=this.session!;
    const now=this.clock.now();
    const elapsed=clamp(sample.elapsedSeconds,0,MAX_SAMPLE_SECONDS);

    session.elapsedSeconds=Math.min(session.elapsedSeconds+elapsed,86_400);
    session.lastActivityAt=now;
    session.interactionCount=Math.min(
      session.interactionCount+Math.max(0,Math.min(sample.interactions,500)),
      10_000
    );
    session.scrollCount=Math.min(
      session.scrollCount+Math.max(0,Math.min(sample.scrolls,500)),
      10_000
    );
    session.contextSwitches=Math.min(
      session.contextSwitches+Math.max(0,Math.min(sample.contextSwitches??0,50)),
      1_000
    );

    const intent=this.config.intent as IntentEnvelope|undefined;
    const intentMatch=sample.domain?matchDomain(intent,sample.domain):undefined;
    session.intentMatch=sample.intentMatch??(intentMatch?.confidence??1);
    session.outsideIntent=sample.outsideIntent??(intentMatch?!intentMatch.matches:false);
    session.notificationLaunch=Boolean(sample.notificationLaunch);
    session.lateNightRisk=clamp(sample.lateNightRisk??0);

    const passiveSample=(sample.interactions===0&&sample.scrolls>0) ||
      (sample.scrolls>=20&&sample.scrolls>=sample.interactions*10);

    if(passiveSample){
      session.passiveSeconds=Math.min(
        session.passiveSeconds+elapsed,
        session.elapsedSeconds
      );
    }

    const total=Math.max(1,session.interactionCount+session.scrollCount);
    const interactionRate=clamp(session.interactionCount/total);
    const scrollEventsPerMinute=Math.min(
      120,
      session.scrollCount/Math.max(1,session.elapsedSeconds/60)
    );

    const passiveFeatures={
      sessionSeconds:session.elapsedSeconds,
      repeatedOpens:session.recentReopens,
      recentReopens:session.recentReopens,
      passiveSeconds:session.passiveSeconds,
      interactionRate,
      scrollEventsPerMinute,
      contextSwitches:session.contextSwitches,
      declaredIntentMatch:session.intentMatch,
      outsideIntent:session.outsideIntent,
      lateNightRisk:session.lateNightRisk,
      notificationLaunch:session.notificationLaunch,
      previousInterventionIgnored:session.previousInterventionIgnored,
      ...(sample.scrollBursts===undefined?{}:{scrollBursts:sample.scrollBursts}),
      ...(sample.scrollDirectionChanges===undefined?{}:{scrollDirectionChanges:sample.scrollDirectionChanges}),
      ...(sample.scrollDistancePerMinute===undefined?{}:{scrollDistancePerMinute:sample.scrollDistancePerMinute})
    };
    const passiveLoop=detectPassiveScrollLoop(passiveFeatures);

    let assessment=assessAttention({
      sessionSeconds:session.elapsedSeconds,
      repeatedOpens:session.recentReopens,
      recentReopens:session.recentReopens,
      passiveSeconds:session.passiveSeconds,
      interactionRate,
      scrollEventsPerMinute,
      contextSwitches:session.contextSwitches,
      declaredIntentMatch:session.intentMatch,
      outsideIntent:session.outsideIntent,
      lateNightRisk:session.lateNightRisk,
      notificationLaunch:session.notificationLaunch,
      previousInterventionIgnored:session.previousInterventionIgnored
    });

    if(passiveLoop.detected){
      assessment={
        ...assessment,
        score:Math.max(assessment.score,0.45),
        state:assessment.score<0.45?"drifting":assessment.state,
        reasons:[...new Set([...assessment.reasons,"passive scroll loop detected"])]
      };
    }

    let selected=chooseIntervention(
      assessment,
      this.config.profile,
      now,
      {strict:this.config.protectionMode==="strict"}
    );

    const currentDate=new Date(now);
    const currentMinute=currentDate.getHours()*60+currentDate.getMinutes();
    const currentHour=currentDate.getHours();

    const budget=this.config.intent
      ? budgetStatus(this.config.intent,session.elapsedSeconds)
      : "none";

    if(budget==="approaching"&&selected.intervention==="none"){
      selected={
        ...selected,
        intervention:"awareness",
        reason:"Your local intent budget is nearly reached."
      };
    }else if(budget==="exceeded"&&selected.intervention==="none"){
      selected={
        ...selected,
        intervention:"pause",
        reason:"Your local intent budget has been reached."
      };
    }

    const twin=this.config.attentionTwin;
    const preemptive=twin!==undefined &&
      twin.sampleDays>=7 &&
      twin.highRiskHours.includes(currentHour) &&
      session.elapsedSeconds>=300;

    if(preemptive&&selected.intervention==="none"){
      selected={
        ...selected,
        intervention:"awareness",
        reason:"Local Attention Twin indicates a high-risk attention window."
      };
    }

    const policyIntervention=applyPolicy(
      selected.intervention,
      this.config.rules,
      {domain:sample.domain??"web",minuteOfDay:currentMinute}
    );

    const commitmentIntervention=applyCommitments(
      policyIntervention,
      this.config.commitments,
      sample.domain??"web",
      now
    );

    const cooldownActive=
      session.lastInterventionAt!==undefined &&
      now-session.lastInterventionAt<60_000;

    const intervention=cooldownActive?"none":commitmentIntervention;

    if(intervention!=="none"){
      session.lastInterventionAt=now;
      session.state="paused";
    }else{
      session.state="active";
    }

    let day=this.summary.date===todayKey()?this.summary:emptyDay();

    day=passiveSample
      ? addDailySeconds(day,"passiveSeconds",elapsed)
      : addDailySeconds(day,"intentionalSeconds",session.outsideIntent?0:elapsed);

    if(intervention!=="none"){
      day=recordDriftEpisode(day,currentHour);
      day=recordInterventionShown(day);
    }

    this.summary=day;

    const recovery=recommendRecovery({
      minutesRecovered:Math.max(2,Math.round(elapsed/60)),
      intentPurpose:this.config.intent?.purpose??"other",
      timeOfDay:timeOfDay(currentDate),
      consecutiveDriftEpisodes:day.driftEpisodes
    });

    return {
      session,
      assessment,
      intervention,
      recoveryMinutes:recovery[0]?.durationMinutes??2,
      dailySummary:day
    };
  }

  respond(intervention:string,outcome:"continued"|"exited"){
    const key=normalizeIntervention(intervention);
    if(!key)return;
    this.config.profile.attemptsByIntervention[key]=
      (this.config.profile.attemptsByIntervention[key]??0)+1;

    if(outcome==="exited"){
      this.config.profile.successByIntervention[key]=
        (this.config.profile.successByIntervention[key]??0)+1;
    }

    this.summary=recordInterventionOutcome(this.summary,outcome==="exited");

    if(this.session){
      this.session.previousInterventionIgnored=outcome==="continued";
      this.session.state=outcome==="continued"?"active":"recovering";
    }
  }

  complete(){
    if(this.session)this.session.state="completed";
  }
}

function clamp(value:number,min=0,max=1){
  return Math.min(max,Math.max(min,value));
}

function normalizeIntervention(value:string):Intervention|undefined{
  const allowed:Intervention[]=["none","awareness","deliberation","pause","delay","commitment","lock"];
  return allowed.includes(value as Intervention)?value as Intervention:undefined;
}

function timeOfDay(date:Date):"morning"|"day"|"evening"|"night"{
  const hour=date.getHours();
  if(hour<7)return "morning";
  if(hour<17)return "day";
  if(hour<22)return "evening";
  return "night";
}
