import type {BehaviorFeatures} from "./types.js";

export interface PassiveScrollAssessment{
  detected:boolean;
  confidence:number;
  reasons:string[];
}

const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));

export function detectPassiveScrollLoop(features:BehaviorFeatures):PassiveScrollAssessment{
  const reasons:string[]=[];
  let confidence=0;
  const minutes=features.sessionSeconds/60;
  const scrollDensity=features.scrollEventsPerMinute??0;

  if(minutes>=8){confidence+=.18;reasons.push("sustained session");}
  if(scrollDensity>=24){confidence+=.25;reasons.push("high scroll density");}
  if(features.interactionRate<.10){confidence+=.25;reasons.push("low active interaction");}
  if(features.recentReopens>=2){confidence+=.10;reasons.push("repeated re-entry");}
  if(features.declaredIntentMatch<.5||features.outsideIntent){confidence+=.12;reasons.push("activity outside declared intent");}
  if(features.lateNightRisk>.6){confidence+=.10;reasons.push("high-risk time window");}

  confidence=clamp(confidence);
  return {detected:confidence>=.55,confidence,reasons};
}
