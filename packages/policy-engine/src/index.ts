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

const order:Intervention[]=["none","awareness","deliberation","pause","delay","commitment","lock"];
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
