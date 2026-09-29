type Purpose="work"|"study"|"communication"|"entertainment"|"rest"|"other";
interface LocalIntent{label:string;targetDomains:string[];startedAt:number;purpose:Purpose;budgetMinutes?:number}
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

chrome.storage.local.get(["currentIntent","protectionMode","dailySummary","webProtectionEnabled"]).then(result=>{
 const value=result.currentIntent as LocalIntent|undefined;
 if(value){
  intentEl.value=value.label;
  domainsEl.value=value.targetDomains.join(", ");
  purposeEl.value=value.purpose;
  budgetEl.value=value.budgetMinutes?String(value.budgetMinutes):"";
 }
 modeEl.value=(result.protectionMode as LocalSettings["protectionMode"]|undefined)??"adaptive";
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

 await chrome.storage.local.set({
  currentIntent:{label,targetDomains,startedAt:Date.now(),purpose,budgetMinutes},
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
 const stored=await chrome.storage.local.get("rules");
 const rules=Array.isArray(stored.rules)?stored.rules:readonly [];
 const next=[...rules.filter((rule:unknown)=>typeof rule==="object"&&rule!==null&&(rule as Record<string,unknown>).value!==value),
  {id:"rule_"+crypto.randomUUID(),target:"site",value,enabled:true,minimumIntervention:ruleLevelEl.value}
 ].slice(0,100);
 await chrome.storage.local.set({rules:next});
 ruleDomainEl.value="";
 statusEl.textContent="Site rule saved on this device.";
});
