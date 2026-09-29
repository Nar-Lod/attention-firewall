"use client";

import {useState} from "react";
import {browserStore} from "@attention-firewall/local-store";
import {DEFAULT_PROFILE} from "@attention-firewall/local-store/src/schema";

export default function PrivacyPage(){
 const [message,setMessage]=useState("");
 const clear=async()=>{
  await browserStore("attention-firewall.profile").clear();
  setMessage("Local settings and learned profile cleared.");
 };
 const localOnly=async()=>{
  await browserStore("attention-firewall.profile").set(DEFAULT_PROFILE);
  setMessage("Local-only mode is enabled. No cloud telemetry is required.");
 };
 return <main style={{maxWidth:900,margin:"0 auto",padding:"60px 24px",fontFamily:"system-ui",color:"#fff",background:"#090909",minHeight:"100vh"}}>
   <a href="/" style={{color:"#d7bb62"}}>← Dashboard</a>
   <h1 style={{fontSize:48,letterSpacing:"-.04em"}}>Privacy Center</h1>
   <p style={{color:"#999",maxWidth:700,lineHeight:1.7}}>Attention Firewall is designed so detailed attention history stays on your device. This page manages local privacy controls; it does not need your browsing history.</p>
   <section style={{display:"grid",gap:12,maxWidth:620}}>
    <div style={{border:"1px solid #2a2a2a",padding:24,background:"#111"}}><h2>Local-only mode</h2><p style={{color:"#888"}}>Use the product without an account or behavioral telemetry.</p><button onClick={localOnly}>Enable local-only mode</button></div>
    <div style={{border:"1px solid #2a2a2a",padding:24,background:"#111"}}><h2>Delete local profile</h2><p style={{color:"#888"}}>Removes locally stored settings and learned intervention outcomes for this browser.</p><button onClick={clear}>Delete local profile</button></div>
   </section>
   {message&&<p style={{color:"#9dcda5"}}>{message}</p>}
 </main>
}
