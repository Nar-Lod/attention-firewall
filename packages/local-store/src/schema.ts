import type {Commitment} from "@attention-firewall/commitment-engine";

export interface LocalProfile{
 version:1;
 intent?:{
  id:string;
  label:string;
  purpose:"work"|"study"|"communication"|"entertainment"|"rest"|"other";
  startedAt:number;
  budgetMinutes?:number;
  targetDomains:string[];
 };
 rules:Array<{
  id:string;
  target:"site"|"category"|"all-web";
  value:string;
  enabled:boolean;
  minimumIntervention:"awareness"|"deliberation"|"pause"|"delay"|"commitment"|"lock";
  startMinute?:number;
  endMinute?:number;
 }>;
 commitments:Commitment[];
 interventionProfile:{
  successByIntervention:Record<string,number>;
  attemptsByIntervention:Record<string,number>;
 };
 privacy:{
  telemetryOptIn:boolean;
  researchOptIn:boolean;
 };
}

export const DEFAULT_PROFILE:LocalProfile={
 version:1,
 rules:[],
 commitments:[],
 interventionProfile:{successByIntervention:{},attemptsByIntervention:{}},
 privacy:{telemetryOptIn:false,researchOptIn:false}
};
