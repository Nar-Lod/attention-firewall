"use client";

import {useEffect,useMemo,useState} from "react";
import {EncryptedIndexedDbStore} from "@attention-firewall/secure-browser-store";

interface LocalProfile{
 version:1;
 protectionMode:"adaptive"|"strict";
 privacy:{telemetryOptIn:boolean;researchOptIn:boolean};
 currentIntent?:{label:string;purpose:string;targetDomains:string[];budgetMinutes?:number};
 rules:unknown[];
 commitments:unknown[];
 interventionProfile:unknown;
}

export default function AccountPage(){
 const store=useMemo(()=>new EncryptedIndexedDbStore<LocalProfile>("profile-v2","attention-firewall-web-profile"),[]);
 const [state,setState]=useState<LocalProfile|null>(null);
 useEffect(()=>{void store.get().then(setState);},[store]);

 return <main className="privacy-page">
  <nav><a href="/">← Dashboard</a> · <a href="/insights">Insights</a> · <a href="/privacy">Privacy</a></nav>
  <p className="eyebrow" style={{marginTop:32}}>ACCOUNT & DEVICE SECURITY</p>
  <h1>Your security boundary</h1>
  <p className="lead">Behavioral protection remains local. Account infrastructure is separate and is only activated when a real authenticated service is configured.</p>
  <section className="privacy-grid">
   <div className="privacy-card"><div className="label">LOCAL VAULT</div><h2>{state?"Encrypted vault active":"Not initialized yet"}</h2><p>Your browser stores the protection profile in an encrypted IndexedDB vault.</p><p>Protection mode: <strong>{state?.protectionMode??"adaptive"}</strong></p></div>
   <div className="privacy-card"><div className="label">PASSKEY ACCOUNT</div><h2>Passwordless authentication</h2><p>Production auth is passkey-first. The server never receives private key material or behavioral history.</p><a href="/auth"><button type="button">Open passkey account</button></a></div>
   <div className="privacy-card"><div className="label">DEVICE BOUNDARY</div><h2>Revocable device identity</h2><p>When account services are enabled, each device gets a random revocable identifier and sessions use Secure, HttpOnly cookies.</p></div>
  </section>
  <footer><span>Security metadata is separate from attention history.</span><a href="/privacy">Privacy Center →</a></footer>
 </main>;
}
