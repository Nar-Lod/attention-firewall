import type {AttentionAssessment,AttentionModelConfig,BehaviorFeatures} from "./types.js";

export const DEFAULT_ATTENTION_MODEL:AttentionModelConfig={
 version:"attention-v1",
 sessionWeight:.18,
 passiveWeight:.22,
 interactionWeight:.16,
 reopenWeight:.12,
 switchWeight:.10,
 intentWeight:.14,
 lateNightWeight:.08,
 notificationWeight:.05,
 ignoredWeight:.08,
 focusedThreshold:.15,
 intentionalThreshold:.30,
 neutralThreshold:.45,
 driftingThreshold:.65
};

const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));

export function assessAttention(
 f:BehaviorFeatures,
 model:AttentionModelConfig=DEFAULT_ATTENTION_MODEL
):AttentionAssessment{
 const reasons:string[]=[];
 let score=0;
 const minutes=f.sessionSeconds/60;

 if(minutes>=10){score+=clamp((minutes-10)/30)*model.sessionWeight;reasons.push("extended session");}
 if(f.passiveSeconds>=300){score+=clamp((f.passiveSeconds-300)/1200)*model.passiveWeight;reasons.push("extended passive consumption");}
 if(f.interactionRate<.08){score+=clamp((.08-f.interactionRate)/.08)*model.interactionWeight;reasons.push("low interaction rate");}
 if(f.recentReopens>=2){score+=clamp(f.recentReopens/6)*model.reopenWeight;reasons.push("repeated reopening");}
 if(f.contextSwitches>=3){score+=clamp(f.contextSwitches/8)*model.switchWeight;reasons.push("attention switching");}
 if(f.outsideIntent){score+=(1-clamp(f.declaredIntentMatch))*model.intentWeight;reasons.push("activity diverged from intent");}
 score+=clamp(f.lateNightRisk)*model.lateNightWeight;
 if(f.lateNightRisk>.6)reasons.push("high-risk time window");
 if(f.notificationLaunch){score+=model.notificationWeight;reasons.push("notification-initiated session");}
 if(f.previousInterventionIgnored){score+=model.ignoredWeight;reasons.push("previous intervention ignored");}

 score=clamp(score);
 const state:AttentionAssessment["state"]=
  score<model.focusedThreshold?"focused":
  score<model.intentionalThreshold?"intentional":
  score<model.neutralThreshold?"neutral":
  score<model.driftingThreshold?"drifting":"compulsive-risk";

 return {score,state,reasons:[...new Set(reasons)],modelVersion:model.version};
}
