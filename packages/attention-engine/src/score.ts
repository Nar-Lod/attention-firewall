import type {AttentionAssessment,BehaviorFeatures} from "./types.js";
const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));
export function assessAttention(f:BehaviorFeatures):AttentionAssessment{
  const reasons:string[]=[]; let score=0; const minutes=f.sessionSeconds/60;
  if(minutes>=10){score+=clamp((minutes-10)/30)*.18;reasons.push("extended session");}
  if(f.passiveSeconds>=300){score+=clamp((f.passiveSeconds-300)/1200)*.22;reasons.push("extended passive consumption");}
  if(f.interactionRate<.08){score+=clamp((.08-f.interactionRate)/.08)*.16;reasons.push("low interaction rate");}
  if(f.recentReopens>=2){score+=clamp(f.recentReopens/6)*.12;reasons.push("repeated reopening");}
  if(f.contextSwitches>=3){score+=clamp(f.contextSwitches/8)*.10;reasons.push("attention switching");}
  if(f.outsideIntent){score+=(1-clamp(f.declaredIntentMatch))*.14;reasons.push("activity diverged from intent");}
  score+=clamp(f.lateNightRisk)*.08;
  if(f.lateNightRisk>.6) reasons.push("high-risk time window");
  if(f.notificationLaunch){score+=.05;reasons.push("notification-initiated session");}
  if(f.previousInterventionIgnored){score+=.08;reasons.push("previous intervention ignored");}
  score=clamp(score);
  const state:AttentionAssessment["state"]=score<.15?"focused":score<.30?"intentional":score<.45?"neutral":score<.65?"drifting":"compulsive-risk";
  return {score,state,reasons:[...new Set(reasons)]};
}
