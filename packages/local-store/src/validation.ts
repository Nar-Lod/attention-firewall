import type {LocalProfile} from "./schema.js";
import {validateCommitment} from "@attention-firewall/commitment-engine";

const purposes=new Set(["work","study","communication","entertainment","rest","other"]);
const targets=new Set(["site","category","all-web"]);
const levels=new Set(["awareness","deliberation","pause","delay","commitment","lock"]);

export function parseLocalProfile(value:unknown):LocalProfile{
 if(!value||typeof value!=="object")throw new Error("invalid profile");
 const v=value as Record<string,unknown>;
 if(v.version!==1||!Array.isArray(v.rules)||!Array.isArray(v.commitments)||!v.interventionProfile||!v.privacy)throw new Error("invalid profile shape");
 if(v.commitments.length>50)throw new Error("too many commitments");
 for(const commitment of v.commitments)validateCommitment(commitment);
 if(v.rules.length>100)throw new Error("too many rules");

 for(const rule of v.rules){
  if(!rule||typeof rule!=="object")throw new Error("invalid rule");
  const r=rule as Record<string,unknown>;
  if(typeof r.id!=="string"||r.id.length<1||r.id.length>80)throw new Error("invalid rule id");
  if(typeof r.target!=="string"||!targets.has(r.target))throw new Error("invalid rule target");
  if(typeof r.value!=="string"||r.value.length<1||r.value.length>253)throw new Error("invalid rule value");
  if(typeof r.enabled!=="boolean")throw new Error("invalid rule enabled");
  if(typeof r.minimumIntervention!=="string"||!levels.has(r.minimumIntervention))throw new Error("invalid rule intervention");
  for(const key of ["startMinute","endMinute"]){
   const n=r[key];
   if(n!==undefined&&(!Number.isInteger(n)||Number(n)<0||Number(n)>1439))throw new Error("invalid rule time");
  }
 }

 if(v.intent!==undefined){
  if(!v.intent||typeof v.intent!=="object")throw new Error("invalid intent");
  const i=v.intent as Record<string,unknown>;
  if(typeof i.id!=="string"||i.id.length>80||typeof i.label!=="string"||i.label.length>120||typeof i.purpose!=="string"||!purposes.has(i.purpose))throw new Error("invalid intent");
  if(!Array.isArray(i.targetDomains)||i.targetDomains.length>30)throw new Error("invalid intent targets");
  for(const domain of i.targetDomains)if(typeof domain!=="string"||domain.length<1||domain.length>253)throw new Error("invalid intent domain");
  if(i.budgetMinutes!==undefined&&(!Number.isInteger(i.budgetMinutes)||Number(i.budgetMinutes)<1||Number(i.budgetMinutes)>240))throw new Error("invalid intent budget");
 }

 const privacy=v.privacy as Record<string,unknown>;
 if(typeof privacy.telemetryOptIn!=="boolean"||typeof privacy.researchOptIn!=="boolean")throw new Error("invalid privacy");
 return value as LocalProfile;
}


export interface SafeInterventionProfile{successByIntervention:Record<string,number>;attemptsByIntervention:Record<string,number>}
const interventions=new Set(["none","awareness","deliberation","pause","delay","commitment","lock"]);

export function parseInterventionProfile(value:unknown):SafeInterventionProfile{
 if(!value||typeof value!=="object")return {successByIntervention:{},attemptsByIntervention:{}};
 const v=value as Record<string,unknown>;
 return {successByIntervention:readCounts(v.successByIntervention),attemptsByIntervention:readCounts(v.attemptsByIntervention)};
}

function readCounts(value:unknown):Record<string,number>{
 if(!value||typeof value!=="object")return {};
 const out:Record<string,number>={};
 for(const [key,raw] of Object.entries(value as Record<string,unknown>)){
  if(!interventions.has(key)||typeof raw!=="number"||!Number.isFinite(raw)||raw<0||raw>100000)continue;
  out[key]=Math.floor(raw);
 }
 return out;
}


export function parseCommitments(value:unknown):import("@attention-firewall/commitment-engine").Commitment[]{
 if(!Array.isArray(value))return [];
 const out=[];
 for(const item of value.slice(0,50)){
  try{out.push(validateCommitment(item));}catch{}
 }
 return out;
}
