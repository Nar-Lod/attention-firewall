export type IntentPurpose="work"|"study"|"communication"|"entertainment"|"rest"|"other";

export interface IntentEnvelope{
 id:string;
 label:string;
 purpose:IntentPurpose;
 targetDomains:string[];
 startedAt:number;
 budgetMinutes?:number;
}

export interface IntentMatch{
 matches:boolean;
 confidence:number;
 reason:"no-targets"|"target-domain"|"outside-target"|"invalid-domain";
}

export function normalizeDomain(input:string):string{
 const raw=input.trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0]??"";
 if(!raw||raw.length>253||raw.includes("..")||raw.includes(" "))return "";
 try{
  return new URL("https://"+raw).hostname.replace(/^www\./,"").slice(0,253);
 }catch{return "";}
}

export function matchDomain(intent:IntentEnvelope|undefined,domain:string):IntentMatch{
 if(!intent)return {matches:true,confidence:.25,reason:"no-targets"};
 const normalized=normalizeDomain(domain);
 if(!normalized)return {matches:false,confidence:1,reason:"invalid-domain"};
 const targets=intent.targetDomains.map(normalizeDomain).filter(Boolean);
 if(targets.length===0)return {matches:true,confidence:.5,reason:"no-targets"};
 const exact=targets.some(target=>normalized===target||normalized.endsWith("."+target));
 return exact
  ? {matches:true,confidence:1,reason:"target-domain"}
  : {matches:false,confidence:.95,reason:"outside-target"};
}

export function budgetStatus(intent:IntentEnvelope,elapsedSeconds:number):"none"|"approaching"|"exceeded"{
 if(intent.budgetMinutes===undefined)return "none";
 if(!Number.isFinite(intent.budgetMinutes)||intent.budgetMinutes<=0)return "none";
 const ratio=elapsedSeconds/(intent.budgetMinutes*60);
 if(ratio>=1)return "exceeded";
 if(ratio>=.8)return "approaching";
 return "none";
}


export function sanitizeIntent(value:unknown):IntentEnvelope|undefined{
 if(!value||typeof value!=="object")return undefined;
 const v=value as Record<string,unknown>;
 if(typeof v.id!=="string"||v.id.length<1||v.id.length>80)return undefined;
 if(typeof v.label!=="string"||v.label.length<1||v.label.length>120)return undefined;
 if(!["work","study","communication","entertainment","rest","other"].includes(String(v.purpose)))return undefined;
 if(!Array.isArray(v.targetDomains)||v.targetDomains.length>30)return undefined;
 const targetDomains=v.targetDomains.map(x=>typeof x==="string"?normalizeDomain(x):"").filter(Boolean);
 if(targetDomains.length!==v.targetDomains.length)return undefined;
 const startedAt=typeof v.startedAt==="number"&&Number.isFinite(v.startedAt)?v.startedAt:Date.now();
 const budgetCandidate=v.budgetMinutes;
 const budgetMinutes=typeof budgetCandidate==="number"&&Number.isInteger(budgetCandidate)&&budgetCandidate>=1&&budgetCandidate<=240?budgetCandidate:undefined;
 return {
  id:v.id,
  label:v.label,
  purpose:v.purpose as IntentPurpose,
  targetDomains,
  startedAt,
  ...(budgetMinutes!==undefined?{budgetMinutes}:{})
 };
}

export function intentToSessionTarget(intent:IntentEnvelope|undefined):string{
 return intent?.targetDomains[0]??"local";
}
