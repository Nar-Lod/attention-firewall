"use client";
import {useMemo,useState} from "react";
import {assessAttention,chooseIntervention} from "@attention-firewall/attention-engine";

const initial={sessionSeconds:740,repeatedOpens:2,recentReopens:2,passiveSeconds:410,interactionRate:.06,contextSwitches:2,declaredIntentMatch:.72,outsideIntent:false,lateNightRisk:.15,notificationLaunch:false,previousInterventionIgnored:false};

export default function Home(){
 const [intent,setIntent]=useState("Finish focused work");
 const [features,setFeatures]=useState(initial);
 const assessment=useMemo(()=>assessAttention(features),[features]);
 const decision=useMemo(()=>chooseIntervention(assessment,{successByIntervention:{},attemptsByIntervention:{}}),[assessment]);
 const reset=()=>setFeatures({...initial,sessionSeconds:0,passiveSeconds:0,recentReopens:0});
 return <main className="shell">
  <header><div className="brand"><span className="mark">AF</span><div><strong>ATTENTION FIREWALL</strong><small>privacy-first attention control</small></div></div><span className="privacy">LOCAL MODE · ON</span></header>
  <section className="hero"><div><p className="eyebrow">YOUR ATTENTION</p><h1>Protect your intention.<br/><em>Not just your time.</em></h1><p className="sub">The dashboard below is a local simulation of the Attention Engine. Behavioral details are not sent to a server.</p></div><div className="score"><span>DRIFT SCORE</span><b>{Math.round(assessment.score*100)}</b><small>{assessment.state}</small></div></section>
  <section className="grid">
   <article className="card intent"><div className="label">CURRENT INTENT</div><input value={intent} onChange={e=>setIntent(e.target.value)} /><p>Declare why you are here. The local engine uses this to detect when activity starts diverging from your goal.</p></article>
   <article className="card"><div className="label">SYSTEM DECISION</div><h2>{decision.intervention}</h2><p>{decision.reason}</p><button onClick={()=>setFeatures(f=>({...f,previousInterventionIgnored:true,recentReopens:f.recentReopens+1}))}>Simulate continued scrolling</button></article>
   <article className="card"><div className="label">SIGNALS · LOCAL ONLY</div><div className="signals">{assessment.reasons.length?assessment.reasons.map(x=><span key={x}>{x}</span>):<span>No drift signals</span>}</div></article>
   <article className="card recovery"><div className="label">RECOVERY</div><h2>Reclaim the next 10 minutes.</h2><p>Exit the loop and choose a useful next action. Recovery is part of the system, not an afterthought.</p><button onClick={reset}>Start recovery</button></article>
  </section>
  <footer><span>Raw browsing history stays on your device.</span><span>Privacy Center →</span></footer>
 </main>
}
