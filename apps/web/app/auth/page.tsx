"use client";

import {useState} from "react";
import {browserSupportsWebAuthn,startAuthentication,startRegistration} from "@simplewebauthn/browser";

export default function AuthPage(){
 const [status,setStatus]=useState("");
 const supported=browserSupportsWebAuthn();

 const register=async()=>{
  if(!supported){setStatus("This browser does not support passkeys.");return;}
  try{
   setStatus("Preparing secure passkey registration…");
   const first=await fetch("/api/auth/register/options",{method:"POST"});
   const payload=await first.json() as {options?:unknown;error?:string};
   if(!first.ok||!payload.options)throw new Error(payload.error??"Registration service unavailable");
   const credential=await startRegistration({optionsJSON:payload.options as Parameters<typeof startRegistration>[0]["optionsJSON"]});
   const second=await fetch("/api/auth/register/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(credential)});
   const result=await second.json() as {error?:string};
   if(!second.ok)throw new Error(result.error??"Registration failed");
   window.location.href="/account";
  }catch(error){
   setStatus(error instanceof Error?error.message:"Registration cancelled.");
  }
 };

 const login=async()=>{
  if(!supported){setStatus("This browser does not support passkeys.");return;}
  try{
   setStatus("Preparing secure sign-in…");
   const first=await fetch("/api/auth/login/options",{method:"POST"});
   const payload=await first.json() as {options?:unknown;error?:string};
   if(!first.ok||!payload.options)throw new Error(payload.error??"Authentication service unavailable");
   const assertion=await startAuthentication({optionsJSON:payload.options as Parameters<typeof startAuthentication>[0]["optionsJSON"]});
   const second=await fetch("/api/auth/login/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(assertion)});
   const result=await second.json() as {error?:string};
   if(!second.ok)throw new Error(result.error??"Authentication failed");
   window.location.href="/account";
  }catch(error){
   setStatus(error instanceof Error?error.message:"Sign-in cancelled.");
  }
 };

 return <main className="privacy-page">
  <nav><a href="/">← Dashboard</a> · <a href="/privacy">Privacy</a></nav>
  <p className="eyebrow" style={{marginTop:32}}>PASSWORDLESS ACCOUNT</p>
  <h1>Your identity, separate from your attention.</h1>
  <p className="lead">A passkey protects the account layer. Your attention history and local intervention model remain on-device.</p>
  <section className="privacy-grid">
   <div className="privacy-card"><div className="label">NEW ACCOUNT</div><h2>Create with a passkey</h2><p>No password or behavioral profile is required for the account ceremony.</p><button onClick={register}>Create passkey account</button></div>
   <div className="privacy-card"><div className="label">RETURNING USER</div><h2>Sign in with a passkey</h2><p>Authentication uses a short-lived challenge and a secure HttpOnly session cookie.</p><button onClick={login}>Sign in</button></div>
   <div className="privacy-card"><div className="label">CURRENT STATUS</div><p>{supported?"This browser exposes WebAuthn/passkey support.":"This browser does not expose WebAuthn/passkey support."}</p></div>
  </section>
  {status&&<p className="privacy-message" role="status">{status}</p>}
 </main>;
}
