import {encryptJson} from "@attention-firewall/security-core";
import {appendSecurityEvent,getLocalState,setLocalState} from "./local-state.js";

type Purpose="work"|"study"|"communication"|"entertainment"|"rest"|"other";
interface LocalIntent{id:string;label:string;targetDomains:string[];startedAt:number;purpose:Purpose;budgetMinutes?:number}
interface DailySummary{date:string;intentionalSeconds:number;passiveSeconds:number;driftEpisodes:number;interventionsShown:number;interventionsAccepted:number;attentionRecoveredSeconds:number}
interface LocalSettings{protectionMode:"adaptive"|"strict";webProtectionEnabled:boolean}

const intentEl=document.getElementById("intent") as HTMLInputElement;
const domainsEl=document.getElementById("domains") as HTMLInputElement;
const purposeEl=document.getElementById("purpose") as HTMLSelectElement;
const budgetEl=document.getElementById("budget") as HTMLInputElement;
const modeEl=document.getElementById("mode") as HTMLSelectElement;
const statusEl=document.getElementById("status") as HTMLDivElement;
const webStatusEl=document.getElementById("webStatus") as HTMLDivElement;
const enableWeb=document.getElementById("webProtection") as HTMLButtonElement;
const disableWeb=document.getElementById("disableWebProtection") as HTMLButtonElement;

Promise.all([getLocalState(),chrome.storage.local.get("webProtectionEnabled")]).then(([state,permissionState])=>{
 const value=state.currentIntent as LocalIntent|undefined;
 if(value){
  intentEl.value=value.label;
  domainsEl.value=value.targetDomains.join(", ");
  purposeEl.value=value.purpose;
  budgetEl.value=value.budgetMinutes?String(value.budgetMinutes):"";
 }
 modeEl.value=state.protectionMode;
 renderSummary(result.dailySummary as DailySummary|undefined);
 renderWebStatus(Boolean(result.webProtectionEnabled));
});

document.getElementById("save")?.addEventListener("click",async()=>{
 const label=intentEl.value.trim().slice(0,120);
 const targetDomains=domainsEl.value.split(",").map(v=>normalizeDomain(v)).filter(Boolean).slice(0,30);
 const purpose=normalizePurpose(purposeEl.value);
 const parsedBudget=Number(budgetEl.value);
 const budgetMinutes=Number.isFinite(parsedBudget)&&parsedBudget>=1&&parsedBudget<=240?Math.floor(parsedBudget):undefined;

 if(!label){statusEl.textContent="Add an intent first.";return;}

 await setLocalState({
  currentIntent:{id:crypto.randomUUID(),label,targetDomains,startedAt:Date.now(),purpose,budgetMinutes},
  protectionMode:modeEl.value==="strict"?"strict":"adaptive"
 });
 statusEl.textContent="Saved on this device. Telemetry remains off by default.";
});

enableWeb?.addEventListener("click",async()=>{
 enableWeb.disabled=true;
 try{
  const granted=await chrome.permissions.request({origins:["https://*/*"]});
  if(!granted){
   renderWebStatus(false);
   webStatusEl.textContent="Not enabled. No website access was granted.";
   return;
  }
  await chrome.storage.local.set({webProtectionEnabled:true});
  await chrome.runtime.sendMessage({type:"ENABLE_WEB_PROTECTION"});
  renderWebStatus(true);
  webStatusEl.textContent="Web Protection enabled after your explicit approval.";
 }catch{
  renderWebStatus(false);
  webStatusEl.textContent="Could not enable Web Protection.";
 }finally{enableWeb.disabled=false;}
});

disableWeb?.addEventListener("click",async()=>{
 disableWeb.disabled=true;
 try{
  await chrome.runtime.sendMessage({type:"DISABLE_WEB_PROTECTION"});
  renderWebStatus(false);
  webStatusEl.textContent="Web Protection disabled. You can also remove site access in Chrome settings.";
 }finally{disableWeb.disabled=false;}
});

function renderWebStatus(enabled:boolean){
 enableWeb.style.display=enabled?"none":"block";
 disableWeb.style.display=enabled?"block":"none";
 webStatusEl.textContent=enabled?"Web Protection: ON":"Web Protection: OFF";
}

function renderSummary(summary:DailySummary|undefined){
 const passive=document.getElementById("passive");
 const drift=document.getElementById("drift");
 const shown=document.getElementById("shown");
 const accepted=document.getElementById("accepted");
 if(!passive||!drift||!shown||!accepted)return;
 passive.textContent=Math.round((summary?.passiveSeconds??0)/60)+"m";
 drift.textContent=String(summary?.driftEpisodes??0);
 shown.textContent=String(summary?.interventionsShown??0);
 const attempts=summary?.interventionsShown??0;
 const exits=summary?.interventionsAccepted??0;
 accepted.textContent=attempts?Math.round((exits/attempts)*100)+"%":"0%";
}

function normalizePurpose(value:string):Purpose{
 return ["work","study","communication","entertainment","rest"].includes(value)?value as Purpose:"other";
}

function normalizeDomain(value:string){
 try{return new URL("https://"+value.trim().replace(/^https?:\/\//,"")).hostname.replace(/^www\./,"").slice(0,253)}
 catch{return ""}
}


const ruleDomainEl=document.getElementById("ruleDomain") as HTMLInputElement;
const ruleLevelEl=document.getElementById("ruleLevel") as HTMLSelectElement;

document.getElementById("saveRule")?.addEventListener("click",async()=>{
 const value=normalizeDomain(ruleDomainEl.value);
 const allowed=["awareness","deliberation","pause","delay","commitment","lock"];
 if(!value||!allowed.includes(ruleLevelEl.value)){
  statusEl.textContent="Enter a valid site and intervention level.";
  return;
 }
 const stored=await getLocalState();
 const rules=Array.isArray(stored.rules)?stored.rules:[];
 const next=[...rules.filter((rule:unknown)=>typeof rule==="object"&&rule!==null&&(rule as Record<string,unknown>).value!==value),
  {id:"rule_"+crypto.randomUUID(),target:"site",value,enabled:true,minimumIntervention:ruleLevelEl.value}
 ].slice(0,100);
 await setLocalState({rules:next});
 ruleDomainEl.value="";
 statusEl.textContent="Site rule saved on this device.";
});

const commitDomainEl=document.getElementById("commitDomain") as HTMLInputElement;
const commitMinutesEl=document.getElementById("commitMinutes") as HTMLInputElement;
const commitLevelEl=document.getElementById("commitLevel") as HTMLSelectElement;

document.getElementById("saveCommitment")?.addEventListener("click",async()=>{
 const target=normalizeDomain(commitDomainEl.value);
 const minutes=Number(commitMinutesEl.value);
 const level=commitLevelEl.value;
 const levels=["pause","delay","commitment","lock"];
 if(!target||!Number.isInteger(minutes)||minutes<1||minutes>240||!levels.includes(level)){
  statusEl.textContent="Enter a valid site, duration and commitment level.";
  return;
 }
 const stored=await getLocalState();
 const commitments=Array.isArray(stored.commitments)?stored.commitments:[];
 const now=Date.now();
 const commitment={
  id:"commit_"+crypto.randomUUID(),
  label:"Protect "+target,
  targetDomains:[target],
  startAt:now,
  endAt:now+minutes*60_000,
  minimumIntervention:level,
  changeCooldownMinutes:Math.min(60,minutes),
  createdAt:now
 };
 await setLocalState({commitments:[...commitments,commitment].slice(-50)});
 commitDomainEl.value="";
 commitMinutesEl.value="";
 statusEl.textContent="Commitment started on this device.";
});


document.getElementById("exportLocal")?.addEventListener("click",async()=>{
 try{
  const passphrase=window.prompt("Create an export passphrase (12+ characters). It is never sent to Attention Firewall.");
  if(!passphrase||passphrase.length<12){statusEl.textContent="Export cancelled. Use at least 12 characters.";return;}
  const snapshot=await getLocalState();
  const blob=await encryptJson({exportedAt:new Date().toISOString(),data:snapshot},passphrase);
  const file=new Blob([JSON.stringify(blob,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(file);
  const link=document.createElement("a");
  link.href=url;
  link.download="attention-firewall-encrypted-profile.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  await appendSecurityEvent("encrypted_export_created","success");
  statusEl.textContent="Encrypted local export created.";
 }catch{
  statusEl.textContent="Export failed. No data was uploaded.";
 }
});

document.getElementById("clearLocal")?.addEventListener("click",async()=>{
 const confirmed=window.confirm("Delete all Attention Firewall data stored in this browser/extension? This cannot be undone.");
 if(!confirmed)return;
 await chrome.runtime.sendMessage({type:"CLEAR_LOCAL_DATA"});
 statusEl.textContent="Local data deleted.";
});
