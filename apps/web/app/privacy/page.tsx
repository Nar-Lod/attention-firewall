"use client";

import {useMemo,useState} from "react";
import {EncryptedIndexedDbStore} from "@attention-firewall/secure-browser-store";
import {encryptJson} from "@attention-firewall/security-core";
import {buildSyncableSettings} from "@attention-firewall/sync-vault";
import {createSecurityEvent,type SecurityEvent} from "@attention-firewall/security-audit";

type LocalProfile={
 version:1;
 intent?:unknown;
 rules:unknown[];
 commitments:unknown[];
 interventionProfile:unknown;
 privacy:{telemetryOptIn:boolean;researchOptIn:boolean};
 securityEvents?:SecurityEvent[];
};

export default function PrivacyPage(){
 const [message,setMessage]=useState("");
 const [passphrase,setPassphrase]=useState("");
 const profileStore=useMemo(()=>new EncryptedIndexedDbStore<LocalProfile>("profile-v2","attention-firewall-web-profile"),[]);
 const historyStore=useMemo(()=>new EncryptedIndexedDbStore<unknown>("history-v2","attention-firewall-web-history"),[]);

 const clear=async()=>{
  await profileStore.clear();
  await historyStore.clear();
  localStorage.removeItem("attention-firewall.profile");
  setMessage("All local Attention Firewall data was deleted from this browser.");
 };

 const localOnly=async()=>{
  const existing=(await profileStore.get())??{
   version:1,rules:[],commitments:[],interventionProfile:{},
   privacy:{telemetryOptIn:false,researchOptIn:false},securityEvents:[]
  };
  const securityEvents=[...(existing.securityEvents??[]),createSecurityEvent("permission_changed","success")].slice(-100);
  await profileStore.set({...existing,privacy:{telemetryOptIn:false,researchOptIn:false},securityEvents});
  setMessage("Local-only mode is enabled. No behavioral telemetry is required.");
 };

 const exportEncrypted=async()=>{
  try{
   if(passphrase.length<12){setMessage("Use a passphrase of at least 12 characters.");return;}
   const profile=(await profileStore.get())??{
    version:1,rules:[],commitments:[],interventionProfile:{},
    privacy:{telemetryOptIn:false,researchOptIn:false},securityEvents:[]
   };
   const syncable=buildSyncableSettings(profile);
   const localBackup=await historyStore.get();
   const blob=await encryptJson({exportedAt:new Date().toISOString(),settings:syncable,localHistory:localBackup},passphrase);
   const file=new Blob([JSON.stringify(blob,null,2)],{type:"application/json"});
   const url=URL.createObjectURL(file);
   const link=document.createElement("a");
   link.href=url;
   link.download="attention-firewall-encrypted-export.json";
   document.body.appendChild(link);
   link.click();
   link.remove();
   URL.revokeObjectURL(url);
   const securityEvents=[...(profile.securityEvents??[]),createSecurityEvent("encrypted_export_created","success")].slice(-100);
   await profileStore.set({...profile,securityEvents});
   setMessage("Encrypted local export created. The passphrase never leaves this browser.");
  }catch{
   setMessage("Export failed. No data was uploaded.");
  }
 };

 return <main className="privacy-page">
  <nav><a href="/">← Dashboard</a> · <a href="/insights">Insights</a> · <a href="/account">Security</a></nav>
  <p className="eyebrow" style={{marginTop:32}}>DATA CONTROL</p>
  <h1>Privacy Center</h1>
  <p className="lead">Attention Firewall is designed local-first. Detailed behavioral state and learned intervention outcomes stay encrypted on this device unless you explicitly export them.</p>
  <section className="privacy-grid">
   <div className="privacy-card"><h2>Local-only mode</h2><p>Disables telemetry preferences while keeping the protection loop entirely on-device.</p><button onClick={localOnly}>Enable local-only mode</button></div>
   <div className="privacy-card"><h2>Encrypted export</h2><p>Create a device-only encrypted backup containing your explicit configuration and local history. The passphrase is never transmitted.</p><input aria-label="Export passphrase" type="password" minLength={12} value={passphrase} onChange={e=>setPassphrase(e.target.value)} placeholder="12+ character passphrase"/><button onClick={exportEncrypted}>Export encrypted copy</button></div>
   <div className="privacy-card"><h2>Delete all local data</h2><p>Removes both the encrypted profile and encrypted local history from this browser.</p><button onClick={clear}>Delete local data</button></div>
  </section>
  {message&&<p className="privacy-message">{message}</p>}
  <footer><span>Cloud sync is optional and excludes behavioral history.</span><a href="/account">Security Center →</a></footer>
 </main>;
}
