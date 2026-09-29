import type {Intervention} from "@attention-firewall/attention-engine";

export type RuleTarget="site"|"category"|"all-web";
export interface PolicyRule{
 id:string;
 target:RuleTarget;
 value:string;
 enabled:boolean;
 minimumIntervention:Intervention;
 startMinute?:number;
 endMinute?:number;
}

export interface PolicyContext{
 domain:string;
 minuteOfDay:number;
 intervention:Intervention;
}

export function ruleApplies(rule:PolicyRule,context:PolicyContext):boolean{
 if(!rule.enabled)return false;
 if(rule.startMinute!==undefined&&rule.endMinute!==undefined){
  const start=Math.max(0,Math.min(1439,rule.startMinute));
  const end=Math.max(0,Math.min(1439,rule.endMinute));
  const inWindow=start<=end?context.minuteOfDay>=start&&context.minuteOfDay<=end:context.minuteOfDay>=start||context.minuteOfDay<=end;
  if(!inWindow)return false;
 }
 if(rule.target==="all-web")return true;
 if(rule.target==="site")return normalizeDomain(context.domain)===normalizeDomain(rule.value);
 return false;
}

const order:Intervention[]=["none","awareness","deliberation","pause","delay","commitment","lock"];\nconst targets=new Set<RuleTarget>(["site","category","all-web"]);\nconst levels=new Set<Intervention>(order);
export function applyPolicy(intervention:Intervention,rules:PolicyRule[],context:Omit<PolicyContext,"intervention">):Intervention{
 let selected=intervention;
 for(const rule of rules){
  if(!ruleApplies(rule,{...context,intervention:selected}))continue;
  if(order.indexOf(rule.minimumIntervention)>order.indexOf(selected))selected=rule.minimumIntervention;
 }
 return selected;
}

function normalizeDomain(value:string):string{
 try{return new URL("https://"+value.trim().replace(/^https?:\/\//,"")).hostname.replace(/^www\./,"").toLowerCase();}
 catch{return "";}
}


export function validateRules(value:unknown):PolicyRule[]{
 if(!Array.isArray(value)||value.length>100)throw new Error("invalid policy rules");
 return value.map((item)=> {
  if(!item||typeof item!=="object")throw new Error("invalid policy rule");
  const r=item as Record<string,unknown>;
  if(typeof r.id!=="string"||r.id.length<1||r.id.length>80)throw new Error("invalid rule id");
  if(typeof r.target!=="string"||!targets.has(r.target))throw new Error("invalid rule target");
  if(typeof r.value!=="string"||r.value.length<1||r.value.length>253)throw new Error("invalid rule value");
  if(typeof r.enabled!=="boolean")throw new Error("invalid rule enabled");
  if(typeof r.minimumIntervention!=="string"||!levels.has(r.minimumIntervention))throw new Error("invalid rule intervention");
  if(r.startMinute!==undefined&&(!Number.isInteger(r.startMinute)||Number(r.startMinute)<0||Number(r.startMinute)>1439))throw new Error("invalid start minute");
  if(r.endMinute!==undefined&&(!Number.isInteger(r.endMinute)||Number(r.endMinute)<0||Number(r.endMinute)>1439))throw new Error("invalid end minute");
  return r as unknown as PolicyRule;
 });
}
