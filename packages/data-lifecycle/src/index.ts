import type {Commitment} from "@attention-firewall/commitment-engine";
import {pruneHistory,type DailyHistory} from "@attention-firewall/local-analytics";
import type {SecurityEvent} from "@attention-firewall/security-audit";

export interface InterventionProfileSnapshot{
 successByIntervention:Record<string,number>;
 attemptsByIntervention:Record<string,number>;
}

export interface LocalLifecycleState{
 dailyHistory:DailyHistory;
 commitments:Commitment[];
 interventionProfile:InterventionProfileSnapshot;
 securityEvents?:SecurityEvent[];
}

export function sweepLocalState(state:LocalLifecycleState,now=Date.now(),maxDays=30):LocalLifecycleState{
 const commitments=state.commitments.filter(commitment=>commitment.endAt>now);
 const profile:safeProfile=normalizeProfile(state.interventionProfile);
 const securityEvents=(state.securityEvents??[]).filter(event=>Number.isFinite(event.occurredAt)&&now-event.occurredAt<=90*24*60*60_000).slice(0,100);
 return {
  dailyHistory:pruneHistory(state.dailyHistory,maxDays,new Date(now).toISOString().slice(0,10)),
  commitments,
  interventionProfile:profile,
  securityEvents
 };
}

type safeProfile=InterventionProfileSnapshot;
function normalizeProfile(profile:InterventionProfileSnapshot):InterventionProfileSnapshot{
 const attempts:{[key:string]:number}={};
 const success:{[key:string]:number}={};
 for(const [key,value] of Object.entries(profile.attemptsByIntervention??{})){
  if(Number.isFinite(value)&&value>=0)attempts[key]=Math.floor(Math.min(value,100000));
 }
 for(const [key,value] of Object.entries(profile.successByIntervention??{})){
  if(Number.isFinite(value)&&value>=0)success[key]=Math.floor(Math.min(value,attempts[key]??0));
 }
 return {successByIntervention:success,attemptsByIntervention:attempts};
}
