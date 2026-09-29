import type {LocalProfile} from "./schema.js";

const purposes=new Set(["work","study","communication","entertainment","rest","other"]);
const targets=new Set(["site","category","all-web"]);
const levels=new Set(["awareness","deliberation","pause","delay","commitment","lock"]);

export function parseLocalProfile(value:unknown):LocalProfile{
 if(!value||typeof value!=="object")throw new Error("invalid profile");
 const v=value as Record<string,unknown>;
 if(v.version!==1||!Array.isArray(v.rules)||!v.interventionProfile||!v.privacy)throw new Error("invalid profile shape");
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
