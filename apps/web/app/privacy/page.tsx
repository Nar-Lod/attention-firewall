"use client";

import {useState} from "react";
import {browserStore,DEFAULT_PROFILE} from "@attention-firewall/local-store";
import {encryptJson} from "@attention-firewall/security-core";

export default function PrivacyPage(){
 const [message,setMessage]=useState("");
 const [passphrase,setPassphrase]=useState("");
 const store=()=>browserStore("attention-firewall.profile");
 const clear=async()=>{await store().clear();setMessage("Local settings and learned profile cleared.");};
 const localOnly=async()=>{await store().set(DEFAULT_PROFILE);setMessage("Local-only mode is enabled. No cloud telemetry is required.");};
 const exportEncrypted=async()=>{
  try{
   if(passphrase.length<12){setMessage("Use a passphrase of at least 12 characters.");return;}
   const profile=await store().get();
   const blob=await encryptJson({exportedAt:new Date().toISOString(),profile},passphrase);
   const file=new Blob([JSON.stringify(blob,null,2)],{type:"application/json"});
   const url=URL.createObjectURL(file);
   const link=document.createElement("a");
   link.href=url;link.download="attention-firewall-encrypted-export.json";
   document.body.appendChild(link);link.click();link.remove();
   URL.revokeObjectURL(url);
   setMessage("Encrypted export created locally.");
  }catch{setMessage("Export failed. No data was uploaded.");}
 };
 return <main className="privacy-page">
  <a href="/">← Dashboard</a>
  <h1>Privacy Center</h1>
  <p className="lead">Detailed attention data is designed to remain on your device. These controls operate locally in this browser.</p>
  <section className="privacy-grid">
   <div className="privacy-card"><h2>Local-only mode</h2><p>Use the product without an account or behavioral telemetry.</p><button onClick={localOnly}>Enable local-only mode</button></div>
   <div className="privacy-card"><h2>Encrypted export</h2><p>Create a device-only encrypted backup. The passphrase is never transmitted.</p><input aria-label="Export passphrase" type="password" minLength={12} value={passphrase} onChange={e=>setPassphrase(e.target.value)} placeholder="12+ character passphrase"/><button onClick={exportEncrypted}>Export encrypted copy</button></div>
   <div className="privacy-card"><h2>Delete local profile</h2><p>Removes locally stored settings and learned intervention outcomes for this browser.</p><button onClick={clear}>Delete local profile</button></div>
  </section>
  {message&&<p className="privacy-message">{message}</p>}
 </main>;
}
