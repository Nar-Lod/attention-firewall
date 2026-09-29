import type {AttentionAssessment,Intervention,InterventionDecision,InterventionProfile} from "./types.js";
const ORDER:Intervention[]=["none","awareness","deliberation","pause","delay","commitment","lock"];
const BASE:Record<AttentionAssessment["state"],Intervention>={
  focused:"none",intentional:"none",neutral:"awareness",drifting:"deliberation","compulsive-risk":"pause",recovering:"none"
};
export function chooseIntervention(a:AttentionAssessment,p:InterventionProfile,now=Date.now()):InterventionDecision{
  let selected=BASE[a.state];
  if(a.state==="compulsive-risk"&&a.score>=.82) selected="delay";
  if(a.state==="compulsive-risk"&&a.score>=.93) selected="commitment";
  const attempts=p.attemptsByIntervention[selected]??0;
  const success=p.successByIntervention[selected]??0;
  const rate=attempts===0?.5:success/attempts;
  if(selected!=="none"&&rate<.25&&attempts>=3){
    const i=ORDER.indexOf(selected); selected=ORDER[Math.min(i+1,ORDER.length-1)]!;
  }
  const cooldown=p.cooldownUntil?.[selected]??0;
  if(cooldown>now){
    const i=ORDER.indexOf(selected); selected=ORDER[Math.min(i+1,ORDER.length-1)]!;
  }
  return {intervention:selected,score:a.score,reason:selected==="none"?"No intervention needed.":"Selected "+selected+" at attention score "+a.score.toFixed(2)+"."};
}
