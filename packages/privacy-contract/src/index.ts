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
const kinds=new Set<TelemetryKind>(["app_opened","intervention_shown","intervention_completed","crash","feature_error"]);
const platforms=new Set(["web","android","ios","desktop"]);
const outcomes=new Set(["continued","exited","completed","unknown"]);
const durationBuckets=new Set(["0-30s","30-120s","2-10m","10-30m","30m+"]);

function boundedString(value:unknown,max:number,label:string):string{
  if(typeof value!=="string"||value.length===0||value.length>max)throw new Error("invalid "+label);
  return value;
}

export function validateTelemetry(input:unknown):CoarseTelemetry{
  if(!input||typeof input!=="object")throw new Error("invalid telemetry");
  const value=input as Record<string,unknown>;
  for(const key of Object.keys(value)){
    if(forbidden.some(x=>key.toLowerCase().includes(x)))throw new Error("forbidden telemetry field: "+key);
  }
  if(value.schemaVersion!==1)throw new Error("unsupported schema");
  const kind=boundedString(value.kind,40,"kind") as TelemetryKind;
  const clientVersion=boundedString(value.clientVersion,32,"clientVersion");
  const engineVersion=boundedString(value.engineVersion,32,"engineVersion");
  const platform=boundedString(value.platform,16,"platform") as CoarseTelemetry["platform"];
  if(!kinds.has(kind)||!platforms.has(platform))throw new Error("invalid enum");
  if(value.intervention!==undefined)boundedString(value.intervention,32,"intervention");
  if(value.outcome!==undefined&&(typeof value.outcome!=="string"||!outcomes.has(value.outcome)))throw new Error("invalid outcome");
  if(value.durationBucket!==undefined&&(typeof value.durationBucket!=="string"||!durationBuckets.has(value.durationBucket)))throw new Error("invalid duration bucket");

  const clean:CoarseTelemetry={schemaVersion:1,kind,clientVersion,engineVersion,platform};
  if(value.intervention!==undefined)clean.intervention=value.intervention as string;
  if(value.outcome!==undefined)clean.outcome=value.outcome as CoarseTelemetry["outcome"];
  if(value.durationBucket!==undefined)clean.durationBucket=value.durationBucket as CoarseTelemetry["durationBucket"];
  return clean;
}
