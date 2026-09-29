export type AttentionState = "focused"|"intentional"|"neutral"|"drifting"|"compulsive-risk"|"recovering";
export type Intervention = "none"|"awareness"|"deliberation"|"pause"|"delay"|"commitment"|"lock";

export interface Intent {
  id:string; label:string; purpose:"work"|"study"|"communication"|"entertainment"|"rest"|"other";
  expectedMinutes?:number; startedAt:number;
}
export interface BehaviorFeatures {
  sessionSeconds:number; repeatedOpens:number; recentReopens:number; passiveSeconds:number;
  interactionRate:number; scrollEventsPerMinute?:number; contextSwitches:number; declaredIntentMatch:number; outsideIntent:boolean;
  lateNightRisk:number; notificationLaunch:boolean; previousInterventionIgnored:boolean;
}
export interface AttentionAssessment { score:number; state:AttentionState; reasons:string[]; }
export interface InterventionProfile {
  successByIntervention:Partial<Record<Intervention,number>>;
  attemptsByIntervention:Partial<Record<Intervention,number>>;
  cooldownUntil?:Partial<Record<Intervention,number>>;
}
export interface InterventionDecision { intervention:Intervention; score:number; reason:string; }
