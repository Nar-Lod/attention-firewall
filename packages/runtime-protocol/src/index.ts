export const RUNTIME_PROTOCOL_VERSION=1 as const;
export type RuntimePlatform="web"|"android"|"ios"|"desktop";
export type RuntimeEventKind="session-start"|"sample"|"intervention-response"|"recovery-completed";

export interface RuntimeSessionStart{
 protocolVersion:typeof RUNTIME_PROTOCOL_VERSION;
 eventKind:"session-start";
 platform:RuntimePlatform;
 domain:string;
}

export interface RuntimeSample{
 protocolVersion:typeof RUNTIME_PROTOCOL_VERSION;
 eventKind:"sample";
 platform:RuntimePlatform;
 domain?:string;
 elapsedSeconds:number;
 interactions:number;
 scrolls:number;
 scrollBursts?:number;
 scrollDirectionChanges?:number;
 scrollDistancePerMinute?:number;
 contextSwitches?:number;
 intentMatch?:number;
 outsideIntent?:boolean;
 notificationLaunch?:boolean;
 lateNightRisk?:number;
}

export interface RuntimeInterventionResponse{
 protocolVersion:typeof RUNTIME_PROTOCOL_VERSION;
 eventKind:"intervention-response";
 platform:RuntimePlatform;
 intervention:string;
 outcome:"continued"|"exited";
}

export interface RuntimeRecoveryCompleted{
 protocolVersion:typeof RUNTIME_PROTOCOL_VERSION;
 eventKind:"recovery-completed";
 platform:RuntimePlatform;
 durationSeconds:number;
}

export type RuntimeEvent=RuntimeSessionStart|RuntimeSample|RuntimeInterventionResponse|RuntimeRecoveryCompleted;

const PLATFORMS=["web","android","ios","desktop"] as const;
const INTERVENTIONS=["none","awareness","deliberation","pause","delay","commitment","lock"] as const;

function validateEnvelope(value:unknown,eventKind:RuntimeEventKind){
 if(!value||typeof value!=="object")throw new Error("invalid runtime event");
 const v=value as Record<string,unknown>;
 if(v.protocolVersion!==RUNTIME_PROTOCOL_VERSION||v.eventKind!==eventKind)throw new Error("invalid runtime event version");
 if(!PLATFORMS.includes(String(v.platform) as RuntimePlatform))throw new Error("invalid platform");
 return v;
}

export function validateRuntimeSessionStart(value:unknown):RuntimeSessionStart{
 const v=validateEnvelope(value,"session-start");
 if(typeof v.domain!=="string"||v.domain.length<1||v.domain.length>253)throw new Error("invalid domain");
 return {protocolVersion:1,eventKind:"session-start",platform:v.platform as RuntimePlatform,domain:v.domain};
}

export function validateRuntimeSample(value:unknown):RuntimeSample{
 const v=validateEnvelope(value,"sample");
 if(v.domain!==undefined&&(typeof v.domain!=="string"||v.domain.length>253))throw new Error("invalid domain");
 requireBoundedInt(v.interactions,0,500,"interactions");
 requireBoundedInt(v.scrolls,0,500,"scrolls");
 requireBoundedFinite(v.elapsedSeconds,0,300,"elapsedSeconds");
 if(v.scrollBursts!==undefined)requireBoundedInt(v.scrollBursts,0,50,"scrollBursts");
 if(v.scrollDirectionChanges!==undefined)requireBoundedInt(v.scrollDirectionChanges,0,50,"scrollDirectionChanges");
 if(v.scrollDistancePerMinute!==undefined)requireBoundedFinite(v.scrollDistancePerMinute,0,50000,"scrollDistancePerMinute");
 if(v.contextSwitches!==undefined)requireBoundedInt(v.contextSwitches,0,50,"contextSwitches");
 if(v.intentMatch!==undefined)requireBoundedFinite(v.intentMatch,0,1,"intentMatch");
 if(v.outsideIntent!==undefined&&typeof v.outsideIntent!=="boolean")throw new Error("invalid outsideIntent");
 if(v.notificationLaunch!==undefined&&typeof v.notificationLaunch!=="boolean")throw new Error("invalid notificationLaunch");
 if(v.lateNightRisk!==undefined)requireBoundedFinite(v.lateNightRisk,0,1,"lateNightRisk");
 return {
  protocolVersion:1,eventKind:"sample",platform:v.platform as RuntimePlatform,
  ...(v.domain!==undefined?{domain:v.domain as string}:{}),
  elapsedSeconds:v.elapsedSeconds as number,interactions:v.interactions as number,scrolls:v.scrolls as number,
  ...(v.scrollBursts!==undefined?{scrollBursts:v.scrollBursts as number}:{}),
  ...(v.scrollDirectionChanges!==undefined?{scrollDirectionChanges:v.scrollDirectionChanges as number}:{}),
  ...(v.scrollDistancePerMinute!==undefined?{scrollDistancePerMinute:v.scrollDistancePerMinute as number}:{}),
  ...(v.contextSwitches!==undefined?{contextSwitches:v.contextSwitches as number}:{}),
  ...(v.intentMatch!==undefined?{intentMatch:v.intentMatch as number}:{}),
  ...(v.outsideIntent!==undefined?{outsideIntent:v.outsideIntent as boolean}:{}),
  ...(v.notificationLaunch!==undefined?{notificationLaunch:v.notificationLaunch as boolean}:{}),
  ...(v.lateNightRisk!==undefined?{lateNightRisk:v.lateNightRisk as number}:{})
 };
}

export function validateRuntimeInterventionResponse(value:unknown):RuntimeInterventionResponse{
 const v=validateEnvelope(value,"intervention-response");
 if(typeof v.intervention!=="string"||!INTERVENTIONS.includes(v.intervention as typeof INTERVENTIONS[number]))throw new Error("invalid intervention");
 if(v.outcome!=="continued"&&v.outcome!=="exited")throw new Error("invalid intervention outcome");
 return {protocolVersion:1,eventKind:"intervention-response",platform:v.platform as RuntimePlatform,intervention:v.intervention,outcome:v.outcome};
}

export function validateRuntimeRecoveryCompleted(value:unknown):RuntimeRecoveryCompleted{
 const v=validateEnvelope(value,"recovery-completed");
 requireBoundedFinite(v.durationSeconds,120,600,"durationSeconds");
 return {protocolVersion:1,eventKind:"recovery-completed",platform:v.platform as RuntimePlatform,durationSeconds:v.durationSeconds as number};
}

function requireBoundedInt(value:unknown,min:number,max:number,label:string):asserts value is number{
 if(!Number.isSafeInteger(value)||Number(value)<min||Number(value)>max)throw new Error("invalid "+label);
}
function requireBoundedFinite(value:unknown,min:number,max:number,label:string):asserts value is number{
 if(typeof value!=="number"||!Number.isFinite(value)||value<min||value>max)throw new Error("invalid "+label);
}
