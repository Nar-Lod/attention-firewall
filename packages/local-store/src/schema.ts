export interface LocalProfile{
 version:1;
 intent?:{id:string;label:string;purpose:string;startedAt:number};
 rules:Array<{id:string;target:string;enabled:boolean;level:"awareness"|"pause"|"delay"|"lock"}>;
 interventionProfile:{successByIntervention:Record<string,number>;attemptsByIntervention:Record<string,number>};
 privacy:{telemetryOptIn:boolean;researchOptIn:boolean};
}
export const DEFAULT_PROFILE:LocalProfile={
 version:1,rules:[],interventionProfile:{successByIntervention:{},attemptsByIntervention:{}},
 privacy:{telemetryOptIn:false,researchOptIn:false}
};
