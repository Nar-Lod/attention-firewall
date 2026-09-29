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
