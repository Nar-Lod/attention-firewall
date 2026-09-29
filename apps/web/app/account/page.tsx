"use client";

import {useEffect,useMemo,useState} from "react";
import {EncryptedIndexedDbStore} from "@attention-firewall/secure-browser-store";
import type {SecurityEvent} from "@attention-firewall/security-audit";

interface LocalState{
 version:2;
 protectionMode:"adaptive"|"strict";
 securityEvents:SecurityEvent[];
 currentIntent?:{label:string;purpose:string;targetDomains:string[];budgetMinutes?:number};
 rules:unknown[];
 commitments:unknown[];
}

export default function AccountPage(){
 const store=useMemo(()=>new EncryptedIndexedDbStore<LocalState>("extension-state-v2","attention-firewall-extension-state"),[]);
 const [state,setState]=useState<LocalState|null>(null);

 useEffect(()=>{void store.get().then(setState);},[store]);

 const events=state?.securityEvents??[];

 return <main className="privacy-page">
  <a href="/">← Dashboard</a>
  <p className="eyebrow" style={{marginTop:32}}>ACCOUNT & DEVICE SECURITY</p>
  <h1>Your security boundary</h1>
  <p className="lead">Attention Firewall keeps behavioral protection local. Account services, when enabled, handle identity and device access separately.</p>

  <section className="privacy-grid">
   <div className="privacy-card">
    <div className="label">PASSKEYS</div>
    <h2>Passwordless account</h2>
    <p>Production account authentication uses WebAuthn/passkeys. Private key material stays with your authenticator.</p>
    <button type="button" disabled>Passkey setup requires configured account service</button>
   </div>

   <div className="privacy-card">
    <div className="label">DEVICE</div>
    <h2>Local protection</h2>
    <p>{state?"Your local vault is available in this browser.":"Local vault state has not been created yet."}</p>
    <p>Protection mode: <strong>{state?.protectionMode??"adaptive"}</strong></p>
   </div>

   <div className="privacy-card">
    <div className="label">SECURITY HISTORY</div>
    <h2>Control events</h2>
    <p>Only security/control events are shown here. Browsing and attention history are excluded.</p>
    <div className="bar-list">
     {!events.length&&<p className="muted">No security events recorded yet.</p>}
     {events.map(event=><div key={event.id} className="bar-row"><span>{new Date(event.occurredAt).toLocaleDateString()}</span><div><b>{event.type}</b></div><b>{event.outcome}</b></div>)}
    </div>
   </div>
  </section>

  <footer><span>Behavioral history is not part of account authentication.</span><a href="/privacy">Privacy Center →</a></footer>
 </main>;
}
