export type TelemetryKind="app_opened"|"intervention_shown"|"intervention_completed"|"crash"|"feature_error";
export interface CoarseTelemetry{
  schemaVersion:1;
  kind:TelemetryKind;
  clientVersion:string;
  engineVersion:string;
  platform:"web"|"android"|"ios"|"desktop";
  intervention?:string;
  outcome?: "continued"|"exited"|"completed"|"unknown";
  durationBucket?: "0-30s"|"30-120s"|"2-10m"|"10-30m"|"30m+";
}
const forbidden=["url","urls","hostname","path","title","content","query","search","message","screenshot","keystroke","clipboard","location","latitude","longitude","contacts","notification"];
export function validateTelemetry(input:unknown):CoarseTelemetry{
  if(!input||typeof input!=="object")throw new Error("invalid telemetry");
  const value=input as Record<string,unknown>;
  for(const key of Object.keys(value))if(forbidden.some(x=>key.toLowerCase().includes(x)))throw new Error("forbidden telemetry field: "+key);
  if(value.schemaVersion!==1)throw new Error("unsupported schema");
  if(typeof value.kind!=="string"||typeof value.clientVersion!=="string"||typeof value.engineVersion!=="string")throw new Error("invalid telemetry");
  if(!["web","android","ios","desktop"].includes(String(value.platform)))throw new Error("invalid platform");
  return input as CoarseTelemetry;
}
