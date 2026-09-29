interface LocalIntent{label:string;targetDomains:string[];startedAt:number}
interface DailySummary{date:string;intentionalSeconds:number;passiveSeconds:number;driftEpisodes:number;interventionsShown:number;interventionsAccepted:number;attentionRecoveredSeconds:number}
interface LocalSettings{protectionMode:"adaptive"|"strict";telemetryOptIn:false}

const intentEl=document.getElementById("intent") as HTMLInputElement;
const domainsEl=document.getElementById("domains") as HTMLInputElement;
const modeEl=document.getElementById("mode") as HTMLSelectElement;
const statusEl=document.getElementById("status") as HTMLDivElement;

chrome.storage.local.get(["currentIntent","protectionMode","dailySummary"]).then(result=>{
 const value=result.currentIntent as LocalIntent|undefined;
 if(value){intentEl.value=value.label;domainsEl.value=value.targetDomains.join(", ");}
 modeEl.value=(result.protectionMode as LocalSettings["protectionMode"]|undefined)??"adaptive";
 renderSummary(result.dailySummary as DailySummary|undefined);
});

document.getElementById("save")?.addEventListener("click",async()=>{
 const label=intentEl.value.trim().slice(0,120);
 const targetDomains=domainsEl.value.split(",").map(v=>normalizeDomain(v)).filter(Boolean).slice(0,30);
 if(!label){statusEl.textContent="Add an intent first.";return;}
 await chrome.storage.local.set({
  currentIntent:{label,targetDomains,startedAt:Date.now()},
  protectionMode:modeEl.value==="strict"?"strict":"adaptive"
 });
 statusEl.textContent="Saved on this device. Telemetry remains off unless enabled separately.";
});

function renderSummary(summary:DailySummary|undefined){
 const passive=document.getElementById("passive");
 const drift=document.getElementById("drift");
 const shown=document.getElementById("shown");
 const accepted=document.getElementById("accepted");
 if(!passive||!drift||!shown||!accepted)return;
 const seconds=summary?.passiveSeconds??0;
 passive.textContent=Math.round(seconds/60)+"m";
 drift.textContent=String(summary?.driftEpisodes??0);
 shown.textContent=String(summary?.interventionsShown??0);
 const attempts=summary?.interventionsShown??0;
 const exits=summary?.interventionsAccepted??0;
 accepted.textContent=attempts?Math.round((exits/attempts)*100)+"%":"0%";
}

function normalizeDomain(value:string){
 try{return new URL("https://"+value.trim().replace(/^https?:\/\//,"")).hostname.replace(/^www\./,"").slice(0,253)}
 catch{return ""}
}