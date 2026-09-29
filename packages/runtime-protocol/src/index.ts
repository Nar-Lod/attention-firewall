export const RUNTIME_PROTOCOL_VERSION=1 as const;
export type RuntimePlatform="web"|"android"|"ios"|"desktop";
export type RuntimeEventKind="sample"|"intervention-response"|"recovery-completed";

export interface RuntimeSample{
 protocolVersion:typeof RUNTIME_PROTOCOL_VERSION;
 platform:RuntimePlatform;
 domain?:string;
 elapsedSeconds:number;
 interactions:number;
 scrolls:number;
 contextSwitches?:number;
 intentMatch?:number;
 outsideIntent?:boolean;
 notificationLaunch?:boolean;
 lateNightRisk?:number;
}

export interface RuntimeInterventionResponse{
 protocolVersion:typeof RUNTIME_PROTOCOL_VERSION;
 platform:RuntimePlatform;
 intervention:string;
 outcome:"continued"|"exited";
}

export interface RuntimeRecoveryCompleted{
 protocolVersion:typeof RUNTIME_PROTOCOL_VERSION;
 platform:RuntimePlatform;
 durationSeconds:number;
}

export function validateRuntimeSample(value:unknown):RuntimeSample{
 if(!value||typeof value!=="object")throw new Error("invalid runtime sample");
 const v=value as Record<string,unknown>;
 if(v.protocolVersion!==RUNTIME_PROTOCOL_VERSION||v.eventKind!==undefined&&v.eventKind!=="sample")throw new Error("invalid protocol version");
 if(!["web","android","ios","desktop"].includes(String(v.platform)))throw new Error("invalid platform");
 if(v.domain!==undefined&&(typeof v.domain!=="string"||v.domain.length>253))throw new Error("invalid domain");
 requireBoundedInt(v.interactions,0,500,"interactions");
 requireBoundedInt(v.scrolls,0,500,"scrolls");
 requireBoundedFinite(v.elapsedSeconds,0,300,"elapsedSeconds");
 if(v.contextSwitches!==undefined)requireBoundedInt(v.contextSwitches,0,50,"contextSwitches");
 if(v.intentMatch!==undefined)requireBoundedFinite(v.intentMatch,0,1,"intentMatch");
 if(v.outsideIntent!==undefined&&typeof v.outsideIntent!=="boolean")throw new Error("invalid outsideIntent");
 if(v.notificationLaunch!==undefined&&typeof v.notificationLaunch!=="boolean")throw new Error("invalid notificationLaunch");
 if(v.lateNightRisk!==undefined)requireBoundedFinite(v.lateNightRisk,0,1,"lateNightRisk");
 return {
  protocolVersion:RUNTIME_PROTOCOL_VERSION,platform:v.platform as RuntimePlatform,
  ...(v.domain!==undefined?{domain:v.domain as string}:{}),
  elapsedSeconds:v.elapsedSeconds as number,interactions:v.interactions as number,scrolls:v.scrolls as number,
  ...(v.contextSwitches!==undefined?{contextSwitches:v.contextSwitches as number}:{}),
  ...(v.intentMatch!==undefined?{intentMatch:v.intentMatch as number}:{}),
  ...(v.outsideIntent!==undefined?{outsideIntent:v.outsideIntent as boolean}:{}),
  ...(v.notificationLaunch!==undefined?{notificationLaunch:v.notificationLaunch as boolean}:{}),
  ...(v.lateNightRisk!==undefined?{lateNightRisk:v.lateNightRisk as number}:{}),
 };
}

function requireBoundedInt(value:unknown,min:number,max:number,label:string):asserts value is number{
 if(!Number.isSafeInteger(value)||Number(value)<min||Number(value)>max)throw new Error("invalid "+label);
}
function requireBoundedFinite(value:unknown,min:number,max:number,label:string):asserts value is number{
 if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)throw new Error("invalid "+label);
}
