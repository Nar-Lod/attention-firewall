"use client";

import {useEffect,useMemo,useState} from "react";
import {AttentionRuntime} from "@attention-firewall/attention-runtime";
import {buildAttentionTwin} from "@attention-firewall/personalization-engine";
import {emptyDay,pruneHistory,upsertDay,type DailyHistory} from "@attention-firewall/local-analytics";
import {EncryptedIndexedDbStore} from "@attention-firewall/secure-browser-store";
import {normalizeDomain} from "@attention-firewall/intent-engine";
import type {InterventionProfile} from "@attention-firewall/attention-engine";

type Purpose="work"|"study"|"communication"|"entertainment"|"rest"|"other";
type Mode="adaptive"|"strict";
type LocalIntent={
 id:string;
 label:string;
 purpose:Purpose;
 targetDomains:string[];
 startedAt:number;
 budgetMinutes?:number;
};
type Profile={
 version:1;
 intent?:LocalIntent;
 rules:[];
 interventionProfile:InterventionProfile;
 privacy:{telemetryOptIn:boolean;researchOptIn:boolean};
};

const blankProfile:Profile={
 version:1,
 rules:[],
 interventionProfile:{successByIntervention:{},attemptsByIntervention:{}},
 privacy:{telemetryOptIn:false,researchOptIn:false}
};

export default function Home(){
 const profileStore=useMemo(()=>new EncryptedIndexedDbStore<Profile>("profile-v2","attention-firewall-web-profile"),[]);
 const historyStore=useMemo(()=>new EncryptedIndexedDbStore<DailyHistory>("history-v2","attention-firewall-web-history"),[]);

 const [loaded,setLoaded]=useState(false);
 const [profile,setProfile]=useState<Profile>(blankProfile);
 const [intent,setIntent]=useState("Finish focused work");
 const [purpose,setPurpose]=useState<Purpose>("work");
 const [domains,setDomains]=useState("docs.example.com");
 const [budget,setBudget]=useState("30");
 const [mode,setMode]=useState<Mode>("adaptive");
 const [runtime,setRuntime]=useState<AttentionRuntime|null>(null);
 const [assessment,setAssessment]=useState<{score:number;state:string;reasons:string[]}|null>(null);
 const [decision,setDecision]=useState("none");
 const [recovery,setRecovery]=useState(0);
 const [summary,setSummary]=useState(emptyDay());
 const [history,setHistory]=useState<DailyHistory>({version:1,days:[]});
 const [status,setStatus]=useState("");

 useEffect(()=>{
  if(loaded)return;
  void (async()=>{
   const stored=(await profileStore.get())??blankProfile;
   const savedHistory=(await historyStore.get())??{version:1,days:[]};
   setProfile(stored);
   if(stored.intent){
    setIntent(stored.intent.label);
    setPurpose(stored.intent.purpose);
    setDomains(stored.intent.targetDomains.join(", "));
    setBudget(stored.intent.budgetMinutes?String(stored.intent.budgetMinutes):"");
   }
   setMode("adaptive");
   setHistory(savedHistory);
   setSummary(savedHistory.days[0]??emptyDay());
   setLoaded(true);
  })();
 },[loaded,historyStore,profileStore]);

 const twin=useMemo(
  ()=>buildAttentionTwin(history.days,profile.interventionProfile),
  [history,profile.interventionProfile]
 );

 const saveState=async(nextProfile:Profile,nextHistory:DailyHistory)=>{
  setProfile(nextProfile);
  setHistory(nextHistory);
  setSummary(nextHistory.days[0]??emptyDay());
  await profileStore.set(nextProfile);
  await historyStore.set(nextHistory);
 };

 const persistRuntime=async(rt:AttentionRuntime,nextProfile?:Profile)=>{
  const current=rt.getSummary();
  const existing=await historyStore.get()??{version:1,days:[]};
  const nextHistory=pruneHistory(upsertDay(existing,current),30);
  const nextProfile:Profile=nextProfile??{
   ...profile,
   interventionProfile:rt.getInterventionProfile()
  };
  await saveState(nextProfile,nextHistory);
  setStatus("Local state saved.");
 };

 const start=()=>{
  const targetDomains=domains.split(",").map(normalizeDomain).filter(Boolean).slice(0,30);
  if(!intent.trim()||targetDomains.length===0){
   setStatus("Add an intent and at least one target domain.");
   return;
  }
  const startedAt=Date.now();
  const parsedBudget=Number(budget);
  const currentIntent:LocalIntent={
   id:startedAt.toString(36),
   label:intent.trim().slice(0,120),
   purpose,
   targetDomains,
   startedAt,
   budgetMinutes:Number.isFinite(parsedBudget)&&parsedBudget>=1&&parsedBudget<=240?Math.floor(parsedBudget):undefined
  };
  const rt=new AttentionRuntime({
   protectionMode:mode,
   profile:profile.interventionProfile,
   rules:[],
   attentionTwin:twin,
   intent:currentIntent
  },undefined,summary);
  rt.begin(targetDomains[0]!);
  setRuntime(rt);
  setAssessment(null);
  setDecision("none");
  setRecovery(0);
  setProfile({...profile,intent:currentIntent});
  setStatus("Local session started.");
 };

 const sample=(passive:boolean)=>{
  if(!runtime){setStatus("Start a session first.");return;}
  const target=normalizeDomain(domains.split(",")[0]??"");
  const result=runtime.sample({
   elapsedSeconds:60,
   interactions:passive?0:1,
   scrolls:passive?40:6,
   domain:target,
   lateNightRisk:0
  });
  setAssessment(result.assessment);
  setDecision(result.intervention);
  setRecovery(result.recoveryMinutes);
  const nextProfile={
   ...profile,
   intent:runtime["config"]?.intent,
   interventionProfile:runtime.getInterventionProfile()
  } as Profile;
  void persistRuntime(runtime,nextProfile);
 };

 const respond=(outcome:"exited"|"continued")=>{
  if(!runtime||decision==="none"){setStatus("There is no active intervention.");return;}
  runtime.respond(decision,outcome);
  setProfile({...profile,interventionProfile:runtime.getInterventionProfile()});
  setStatus(outcome==="exited"?"Intervention accepted locally.":"Continuation recorded locally.");
 };

 const recoveredMinutes=Math.round((summary.attentionRecoveredSeconds??0)/60);
 const driftRisk=assessment?Math.round(assessment.score*100):0;

 return <main className="shell">
  <header>
   <div className="brand"><span className="mark">AF</span><div><strong>ATTENTION FIREWALL</strong><small>privacy-first attention control</small></div></div>
   <span className="privacy">LOCAL MODE · ON</span>
  </header>

  <section className="hero">
   <div>
    <p className="eyebrow">YOUR ATTENTION</p>
    <h1>Protect your intention.<br/><em>Not just your time.</em></h1>
    <p className="sub">Detailed attention state is processed locally. The cloud is not required for the protection loop.</p>
   </div>
   <div className="score"><span>DRIFT SCORE</span><b>{driftRisk}</b><small>{assessment?.state??"waiting"}</small></div>
  </section>

  <section className="grid">
   <article className="card intent">
    <div className="label">INTENT ENVELOPE · LOCAL</div>
    <input value={intent} onChange={e=>setIntent(e.target.value)} placeholder="What are you here to do?"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
      <select value={purpose} onChange={e=>setPurpose(e.target.value as Purpose)}>
       <option value="work">Work</option><option value="study">Study</option><option value="communication">Communication</option><option value="entertainment">Entertainment</option><option value="rest">Rest</option><option value="other">Other</option>
      </select>
      <input value={budget} onChange={e=>setBudget(e.target.value)} type="number" min="1" max="240" placeholder="Budget min"/>
      <select value={mode} onChange={e=>setMode(e.target.value as Mode)}><option value="adaptive">Adaptive</option><option value="strict">Strict</option></select>
    </div>
    <input value={domains} onChange={e=>setDomains(e.target.value)} placeholder="Target domains, comma separated"/>
    <button onClick={start}>Start local session</button>
   </article>

   <article className="card">
    <div className="label">LIVE ENGINE</div>
    <h2>{decision}</h2>
    <p>{assessment?.reasons.length?assessment.reasons.join(" · "):"No intervention is active."}</p>
    <button onClick={()=>sample(false)}>Simulate intentional minute</button>
    <button onClick={()=>sample(true)} style={{marginLeft:8}}>Simulate passive scroll</button>
    {decision!=="none"&&<div style={{marginTop:16}}><button onClick={()=>respond("exited")}>Exit & record recovery</button><button onClick={()=>respond("continued")} style={{marginLeft:8}}>Continue intentionally</button></div>}
   </article>

   <article className="card">
    <div className="label">ATTENTION TWIN</div>
    <h2>{twin.preferredIntervention}</h2>
    <p>{twin.sampleDays} local days · {twin.highRiskHours.length?twin.highRiskHours.map(h=>String(h).padStart(2,"0")+":00").join(", "):"high-risk windows not learned yet"}</p>
    <p>{recoveredMinutes} min attention recovered</p>
   </article>

   <article className="card recovery">
    <div className="label">RECOVERY</div>
    <h2>{recovery ? "Use the next " + recovery + " minutes deliberately." : "Recovery appears after an intervention."}</h2>
    <p>Leaving the loop is only half the job. Attention Firewall helps convert recovered time into a concrete next action.</p>
    <a href="/privacy">Open Privacy Center</a>
   </article>
  </section>

  {status&&<p className="sub">{status}</p>}
  <footer><span>Detailed behavioral state stays on this device.</span><a href="/privacy">Privacy Center →</a></footer>
 </main>;
}
