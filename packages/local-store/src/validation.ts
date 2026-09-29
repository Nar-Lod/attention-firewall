import type {LocalProfile} from "./schema.js";

const purposes=new Set(["work","study","communication","entertainment","rest","other"]);
const levels=new Set(["awareness","pause","delay","lock"]);

export function parseLocalProfile(value:unknown):LocalProfile{
 if(!value||typeof value!=="object")throw new Error("invalid profile");
 const v=value as Record<string,unknown>;
 if(v.version!==1||!Array.isArray(v.rules)||!v.interventionProfile||!v.privacy)throw new Error("invalid profile shape");
 if(v.rules.length>100)throw new Error("too many rules");
 for(const rule of v.rules){
  if(!rule||typeof rule!=="object")throw new Error("invalid rule");
  const r=rule as Record<string,unknown>;
  if(typeof r.id!=="string"||r.id.length<1||r.id.length>80)throw new Error("invalid rule id");
  if(typeof r.target!=="string"||r.target.length<1||r.target.length>253)throw new Error("invalid rule target");
  if(typeof r.enabled!=="boolean"||typeof r.level!=="string"||!levels.has(r.level))throw new Error("invalid rule");
 }
 const intent=v.intent;
 if(intent!==undefined){
  if(!intent||typeof intent!=="object")throw new Error("invalid intent");
  const i=intent as Record<string,unknown>;
  if(typeof i.id!=="string"||i.id.length>80||typeof i.label!=="string"||i.label.length>120||typeof i.purpose!=="string"||!purposes.has(i.purpose))throw new Error("invalid intent");
 }
 if(!v.privacy||typeof v.privacy!=="object")throw new Error("invalid privacy");
 const privacy=v.privacy as Record<string,unknown>;
 if(typeof privacy.telemetryOptIn!=="boolean"||typeof privacy.researchOptIn!=="boolean")throw new Error("invalid privacy");
 return value as LocalProfile;
}
