import type {AttentionAssessment,Intervention,InterventionProfile} from "@attention-firewall/attention-engine";
import type {IntentEnvelope} from "@attention-firewall/intent-engine";
import type {PolicyRule} from "@attention-firewall/policy-engine";
import type {DailySummary} from "@attention-firewall/local-analytics";

export type ProtectionMode="adaptive"|"strict";

export interface RuntimeSession{
  id:string;
  startedAt:number;
  lastActivityAt:number;
  elapsedSeconds:number;
  passiveSeconds:number;
  recentReopens:number;
  interactionCount:number;
  scrollCount:number;
  contextSwitches:number;
  intentMatch:number;
  outsideIntent:boolean;
  lateNightRisk:number;
  notificationLaunch:boolean;
  previousInterventionIgnored:boolean;
  lastInterventionAt?:number;
  state:"active"|"paused"|"completed";
}

export interface RuntimeConfig{
  protectionMode:ProtectionMode;
  profile:InterventionProfile;
  intent?:IntentEnvelope;\n  rules:PolicyRule[];
}

export interface RuntimeDecision{
  session:RuntimeSession;
  assessment:AttentionAssessment;
  intervention:Intervention;
  recoveryMinutes:number;
  dailySummary:DailySummary;
}
