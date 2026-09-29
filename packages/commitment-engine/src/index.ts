import type {Intervention} from "@attention-firewall/attention-engine";

export interface Commitment{
 id:string;
 label:string;
 targetDomains:string[];
 startAt:number;
 endAt:number;
 minimumIntervention:Intervention;
 changeCooldownMinutes:number;
 createdAt:number;
}

export interface CommitmentStatus{
 active:boolean;
 locked:boolean;
 reason:string;
 remainingSeconds:number;
}

export function validateCommitment(value:unknown):Commitment{
 if(!value||typeof value!=="object")throw new Error("invalid commitment");
 const v=value as Record<string,unknown>;
 if(typeof v.id!=="string"||v.id.length<1||v.id.length>80)throw new Error("invalid id");
 if(typeof v.label!=="string"||v.label.length<1||v.label.length>120)throw new Error("invalid label");
 if(!Array.isArray(v.targetDomains)||v.targetDomains.length<1||v.targetDomains.length>30)throw new Error("invalid targets");
 if(!Number.isFinite(v.startAt)||!Number.isFinite(v.endAt)||Number(v.endAt)<=Number(v.startAt))throw new Error("invalid window");
 if(typeof v.minimumIntervention!=="string"||!["awareness","deliberation","pause","delay","commitment","lock"].includes(v.minimumIntervention))throw new Error("invalid intervention");
 if(!Number.isInteger(v.changeCooldownMinutes)||Number(v.changeCooldownMinutes)<1||Number(v.changeCooldownMinutes)>1440)throw new Error("invalid cooldown");
 if(!Number.isFinite(v.createdAt)||Number(v.createdAt)>Date.now()+60_000)throw new Error("invalid createdAt");
 return v as unknown as Commitment;
}

export function commitmentStatus(commitment:Commitment,now=Date.now()):CommitmentStatus{
 const active=now>=commitment.startAt&&now<commitment.endAt;
 const locked=active&&now<commitment.startAt+commitment.changeCooldownMinutes*60_000;
 const remainingSeconds=active?Math.max(0,Math.floor((commitment.endAt-now)/1000)):0;
 return {
  active,
  locked,
  reason:!active?"Commitment is not currently active.":locked?"Your earlier commitment is in its protected change window.":"Commitment is active.",
  remainingSeconds
 };
}

export function commitmentApplies(commitment:Commitment,domain:string,now=Date.now()):boolean{
 const status=commitmentStatus(commitment,now);
 if(!status.active)return false;
 const normalized=normalizeDomain(domain);
 return commitment.targetDomains.some(target=>{
  const candidate=normalizeDomain(target);
  return Boolean(candidate)&& (normalized===candidate||normalized.endsWith("."+candidate));
 });
}

function normalizeDomain(value:string){
 try{return new URL("https://"+value.trim().replace(/^https?:\/\//,"")).hostname.replace(/^www\./,"").toLowerCase().slice(0,253);}
 catch{return "";}
}
