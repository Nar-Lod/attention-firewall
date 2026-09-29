"use client";

import {useEffect,useMemo,useState} from "react";
import {AttentionRuntime} from "@attention-firewall/attention-runtime";
import {buildAttentionTwin} from "@attention-firewall/personalization-engine";
import {emptyDay,pruneHistory,upsertDay,type DailyHistory} from "@attention-firewall/local-analytics";
import {EncryptedIndexedDbStore} from "@attention-firewall/secure-browser-store";
import {normalizeDomain} from "@attention-firewall/intent-engine";
import type {InterventionProfile} from "@attention-firewall/attention-engine";
import type {PolicyRule} from "@attention-firewall/policy-engine";
import type {Commitment} from "@attention-firewall/commitment-engine";

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
 rules:PolicyRule[];
 commitments:Commitment[];
 interventionProfile:InterventionProfile;
 privacy:{telemetryOptIn:boolean;researchOptIn:boolean};
};

const blankProfile:Profile={
 version:1,
 rules:[],
 commitments:[],
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
 const [commitDomain,setCommitDomain]=useState("");
 const [commitMinutes,setCommitMinutes]=useState("30");
 const [commitLevel,setCommitLevel]=useState<Commitment["minimumIntervention"]>("commitment");
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
   setMode(stored.protectionMode);
   setHistory(savedHistory);
   setSummary(savedHistory.days[0]??emptyDay());
   setLoaded(true);
  })();
 },[loaded,historyStore,profileStore]);

 const twin=useMemo(()=>buildAttentionTwin(history.days,profile.interventionProfile),[history,profile.interventionProfile]);

 const persistState=async(nextProfile:Profile,nextHistory:DailyHistory)=>{
  setProfile(nextProfile);
  setHistory(nextHistory);
  setSummary(nextHistory.days[0]??emptyDay());
  await profileStore.set(nextProfile);
  await historyStore.set(nextHistory);
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
   rules:profile.rules,
   commitments:profile.commitments,
   attentionTwin:twin,
   intent:currentIntent
  },undefined,summary);

  rt.begin(targetDomains[0]!);
  setRuntime(rt);
  const nextProfile={...profile,intent:currentIntent};
  setProfile(nextProfile);
  void profileStore.set(nextProfile);
  setAssessment(null);
  setDecision("none");
  setRecovery(0);
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

  const nextProfile:Profile={
   ...profile,
   interventionProfile:runtime.getInterventionProfile()
  };
  void persistState(nextProfile,pruneHistory(upsertDay(history,result.dailySummary),30));
 };

 const startCommitment=async()=>{
  const target=normalizeDomain(commitDomain);
  const minutes=Number(commitMinutes);
  if(!target||!Number.isInteger(minutes)||minutes<1||minutes>240){
   setStatus("Enter a valid site and commitment length.");
   return;
  }
  const now=Date.now();
  const commitment:Commitment={
   id:"commit_"+crypto.randomUUID(),
   label:"Protect "+target,
   targetDomains:[target],
   startAt:now,
   endAt:now+minutes*60_000,
   minimumIntervention:commitLevel,
   changeCooldownMinutes:Math.min(60,minutes),
   createdAt:now
  };
  const nextProfile:Profile={...profile,commitments:[...profile.commitments,commitment].slice(-50)};
  setProfile(nextProfile);
  await profileStore.set(nextProfile);
  if(runtime)runtime.setConfig({commitments:nextProfile.commitments});
  setCommitDomain("");
  setStatus("Commitment started locally.");
 };

 const respond=(outcome:"exited"|"continued")=>{
  if(!runtime||decision==="none"){setStatus("There is no active intervention.");return;}
  runtime.respond(decision,outcome);
  const nextProfile:Profile={...profile,interventionProfile:runtime.getInterventionProfile()};
  const nextHistory=pruneHistory(upsertDay(history,runtime.getSummary()),30);
  setProfile(nextProfile);
  setHistory(nextHistory);
  setSummary(nextHistory.days[0]??emptyDay());
  void profileStore.set(nextProfile);
  void historyStore.set(nextHistory);
  setStatus(outcome==="exited"?"Intervention accepted locally.":"Continuation recorded locally.");
 };

 const recoveredMinutes=Math.round((summary.attentionRecoveredSeconds??0)/60);
 const driftRisk=assessment?Math.round(assessment.score*100):0;

 return <main className="shell">
  <header>
   <div className="brand"><span className="mark">AF</span><div><strong>ATTENTION FIREWALL</strong><small>privacy-first attention control</small></div></div>
   <nav style={{display:"flex",gap:8,alignItems:"center"}}><a href="/insights">Insights</a><a href="/account">Security</a><a href="/privacy">Privacy</a><span className="privacy">LOCAL MODE · ON</span></nav>
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
    {decision!=="none"&&<div style={{marginTop:16}}><button onClick={()=>respond("exited")}>Exit & record</button><button onClick={()=>respond("continued")} style={{marginLeft:8}}>Continue intentionally</button></div>}
   </article>

   <article className="card">
    <div className="label">ATTENTION TWIN</div>
    <h2>{twin.preferredIntervention}</h2>
    <p>{twin.sampleDays} local days · {twin.highRiskHours.length?twin.highRiskHours.map(h=>String(h).padStart(2,"0")+":00").join(", "):"high-risk windows not learned yet"}</p>
    <p>{recoveredMinutes} min attention recovered</p><p>{profile.commitments.filter(x=>x.endAt>Date.now()).length} active local commitments</p>
   </article>

   <article className="card">
    <div className="label">COMMITMENT · LOCAL</div>
    <input value={commitDomain} onChange={e=>setCommitDomain(e.target.value)} placeholder="Site to protect, e.g. social.example"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <input value={commitMinutes} onChange={e=>setCommitMinutes(e.target.value)} type="number" min="1" max="240" placeholder="Minutes"/>
      <select value={commitLevel} onChange={e=>setCommitLevel(e.target.value as Commitment["minimumIntervention"])}><option value="pause">Pause</option><option value="delay">Delay</option><option value="commitment">Commitment</option><option value="lock">Lock</option></select>
    </div>
    <p>Set the rule while calm. It will be enforced locally until the commitment expires.</p>
    <button onClick={startCommitment}>Start commitment</button>
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
