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
interface SecurityEvent{version:1;id:string;type:string;occurredAt:number;outcome:"success"|"failure";}
interface SessionStatus{authenticated:boolean;serviceConfigured:boolean}

export default function AccountPage(){
 const store=useMemo(()=>new EncryptedIndexedDbStore<LocalProfile>("profile-v2","attention-firewall-web-profile"),[]);
 const [state,setState]=useState<LocalProfile|null>(null);
 const [events,setEvents]=useState<SecurityEvent[]>([]);
 const [session,setSession]=useState<SessionStatus>({authenticated:false,serviceConfigured:false});
 const [status,setStatus]=useState("");

 useEffect(()=>{
  void store.get().then(profile=>{
   setState(profile);
   setEvents((profile as LocalProfile & {securityEvents?:SecurityEvent[]})?.securityEvents??[]);
  });
  void fetch("/api/auth/session",{cache:"no-store"})
   .then(async response=>{
    const body=await response.json() as SessionStatus;
    setSession({authenticated:Boolean(body.authenticated),serviceConfigured:Boolean(body.serviceConfigured)});
   })
   .catch(()=>setSession({authenticated:false,serviceConfigured:false}));
 },[store]);

 const logout=async()=>{
  const response=await fetch("/api/auth/logout",{method:"POST"});
  setStatus(response.ok?"Signed out of the account session.":"Sign-out service unavailable.");
  if(response.ok)setSession({authenticated:false,serviceConfigured:true});
 };

 return <main className="privacy-page">
  <nav><a href="/">← Dashboard</a> · <a href="/insights">Insights</a> · <a href="/privacy">Privacy</a></nav>
  <p className="eyebrow" style={{marginTop:32}}>ACCOUNT & DEVICE SECURITY</p>
  <h1>Your security boundary</h1>
  <p className="lead">The protection engine and attention history remain on-device. Account infrastructure is only used for authentication, subscriptions, device control and optional encrypted settings sync.</p>

  <section className="privacy-grid">
   <div className="privacy-card"><div className="label">LOCAL VAULT</div><h2>{state?"Encrypted vault active":"Not initialized yet"}</h2><p>Your protection profile is stored in the encrypted browser vault.</p><p>Protection mode: <strong>{state?.protectionMode??"adaptive"}</strong></p></div>

   <div className="privacy-card"><div className="label">PASSKEY ACCOUNT</div>
    <h2>{session.authenticated?"Authenticated":"Local-only / not signed in"}</h2>
    <p>{session.serviceConfigured?"Account service is configured.":"This preview is operating without production account infrastructure."}</p>
    {session.authenticated?<button type="button" onClick={logout}>Sign out</button>:<a className="button-link" href="/auth">Open passkey account</a>}
   </div>

   <div className="privacy-card"><div className="label">DEVICE BOUNDARY</div><h2>Revocable identity</h2><p>Production sessions are tied to a random device identifier and use Secure, HttpOnly cookies. Behavioral history is not part of the session.</p></div>

   <div className="privacy-card"><div className="label">LOCAL SECURITY EVENTS</div>
    {events.length?<div className="security-events">{events.slice(0,8).map(event=><div key={event.id}><span>{event.type.replaceAll("_"," ")}</span><b>{event.outcome}</b><small>{new Date(event.occurredAt).toLocaleString()}</small></div>)}</div>:<p>No local security events recorded yet.</p>}
   </div>
  </section>

  {status&&<p className="status-line" role="status">{status}</p>}
  <footer><span>Security metadata is separate from attention history.</span><a href="/privacy">Privacy Center →</a></footer>
 </main>;
}
