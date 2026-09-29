interface LocalIntent{label:string;targetDomains:string[];startedAt:number}
const intentEl=document.getElementById("intent") as HTMLInputElement;
const domainsEl=document.getElementById("domains") as HTMLInputElement;
const statusEl=document.getElementById("status") as HTMLDivElement;

chrome.storage.local.get("currentIntent").then(result=>{
 const value=result.currentIntent as LocalIntent|undefined;
 if(!value)return;
 intentEl.value=value.label;
 domainsEl.value=value.targetDomains.join(", ");
});

document.getElementById("save")?.addEventListener("click",async()=>{
 const label=intentEl.value.trim().slice(0,120);
 const targetDomains=domainsEl.value.split(",").map(v=>normalizeDomain(v)).filter(Boolean).slice(0,30);
 if(!label){statusEl.textContent="Add an intent first.";return;}
 await chrome.storage.local.set({currentIntent:{label,targetDomains,startedAt:Date.now()}});
 statusEl.textContent="Saved on this device. Nothing was uploaded.";
});

function normalizeDomain(value:string){
 try{return new URL("https://"+value.trim().replace(/^https?:\/\//,"")).hostname.replace(/^www\./,"").slice(0,253)}
 catch{return ""}
}