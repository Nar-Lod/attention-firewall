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
import type {SecurityEvent} from "@attention-firewall/security-audit";

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
type RedirectDestination="notes"|"tasks"|"calendar"|"current-task";
type Profile={
 version:1;
 protectionMode:Mode;
 intent?:LocalIntent;
 rules:PolicyRule[];
 commitments:Commitment[];
 interventionProfile:InterventionProfile;
 privacy:{telemetryOptIn:boolean;researchOptIn:boolean};
 redirectShelf:RedirectDestination[];
 securityEvents:SecurityEvent[];
};

const blankProfile:Profile={
 version:1,
 rules:[],
 commitments:[],
 interventionProfile:{successByIntervention:{},attemptsByIntervention:{}},
 privacy:{telemetryOptIn:false,researchOptIn:false},
 redirectShelf:["tasks","notes","calendar","current-task"],
 securityEvents:[],
 protectionMode:"adaptive"
};

export default function Home(){
 const profileStore=useMemo(()=>new EncryptedIndexedDbStore<Profile>("profile-v2","attention-firewall-web-profile"),[]);
 const historyStore=useMemo(()=>new EncryptedIndexedDbStore<DailyHistory>("history-v2","attention-firewall-web-history"),[]);

 const [hydrated,setHydrated]=useState(false);
 const [profile,setProfile]=useState<Profile>(blankProfile);
 const [intent,setIntent]=useState("Finish focused work");
 const [purpose,setPurpose]=useState<Purpose>("work");
 const [domains,setDomains]=useState("docs.example.com");
 const [budget,setBudget]=useState("30");
 const [mode,setMode]=useState<Mode>("adaptive");
 const [commitDomain,setCommitDomain]=useState("");
 const [commitMinutes,setCommitMinutes]=useState("30");
 const [commitLevel,setCommitLevel]=useState<Commitment["minimumIntervention"]>("commitment");
 const [redirectShelf,setRedirectShelf]=useState<RedirectDestination[]>(blankProfile.redirectShelf);
 const [runtime,setRuntime]=useState<AttentionRuntime|null>(null);
 const [summary,setSummary]=useState(emptyDay());
 const [history,setHistory]=useState<DailyHistory>({version:1,days:[]});
 const [status,setStatus]=useState("");
 const [sessionNow,setSessionNow]=useState(Date.now());
 const [setupStep,setSetupStep]=useState(0);
 const [setupFinished,setSetupFinished]=useState(false);
 const [loadError,setLoadError]=useState("");

 useEffect(()=>{
  if(!runtime)return;
  const timer=window.setInterval(()=>setSessionNow(Date.now()),1000);
  return ()=>window.clearInterval(timer);
 },[runtime]);

 useEffect(()=>{
  void (async()=>{
   try{
    const timeout=new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error("Local storage initialization timed out.")),8000));
    const [stored,savedHistory]=await Promise.race([
      Promise.all([profileStore.get(),historyStore.get()]),
      timeout
    ]) as [Profile|null,DailyHistory|null];
    const resolvedProfile=stored??blankProfile;
    const resolvedHistory=savedHistory??{version:1,days:[]};
    setProfile(resolvedProfile);
    if(resolvedProfile.intent){
     setIntent(resolvedProfile.intent.label);
     setPurpose(resolvedProfile.intent.purpose);
     setDomains(resolvedProfile.intent.targetDomains.join(", "));
     setBudget(resolvedProfile.intent.budgetMinutes?String(resolvedProfile.intent.budgetMinutes):"");
    }
    setMode(resolvedProfile.protectionMode);
    setRedirectShelf(resolvedProfile.redirectShelf??blankProfile.redirectShelf);
    setHistory(resolvedHistory);
    setSummary(resolvedHistory.days[0]??emptyDay());
    setSetupFinished(Boolean(resolvedProfile.intent));
    setHydrated(true);
   }catch(error){
    setLoadError(error instanceof Error?error.message:"Local storage is unavailable.");
    setHydrated(true);
   }
  })();
 },[historyStore,profileStore]);

 const twin=useMemo(()=>buildAttentionTwin(history.days,profile.interventionProfile),[history,profile.interventionProfile]);

 const persistState=async(nextProfile:Profile,nextHistory:DailyHistory)=>{
  setProfile(nextProfile);
  setHistory(nextHistory);
  setSummary(nextHistory.days[0]??emptyDay());
  await profileStore.set(nextProfile);
  await historyStore.set(nextHistory);
 };

 const applyPreset=(preset:Purpose)=>{
  const presets:Record<Purpose,{intent:string;budget:string;domains:string}>={work:{intent:"Finish focused work",budget:"45",domains:"docs.example.com, github.com"},study:{intent:"Complete a focused study block",budget:"40",domains:"docs.example.com, wikipedia.org"},communication:{intent:"Handle essential communication",budget:"25",domains:"mail.example.com, calendar.example.com"},entertainment:{intent:"Take a deliberate entertainment break",budget:"30",domains:"video.example.com"},rest:{intent:"Rest without attention drift",budget:"30",domains:"music.example.com"},other:{intent:"Complete one intentional task",budget:"30",domains:"example.com"}};
  const selected=presets[preset];
  setPurpose(preset);setIntent(selected.intent);setBudget(selected.budget);setDomains(selected.domains);setStatus("Preset loaded locally. Review it before starting.");
 };

 const endSession=async(message="Local session ended. Session aggregates were saved to this device.")=>{
  if(!runtime)return;
  const finalSummary=runtime.getSummary();
  const nextHistory=upsertDay(history,finalSummary);
  setHistory(nextHistory);
  setSummary(finalSummary);
  await historyStore.set(nextHistory);
  const nextProfile={...profile,interventionProfile:runtime.getInterventionProfile()};
  setProfile(nextProfile);
  await profileStore.set(nextProfile);
  runtime.complete();
  setRuntime(null);
  setStatus(message);
 };

 const start=async()=>{
  if(runtime)await endSession("Previous local session saved. Starting a new local session.");
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
   ...(Number.isFinite(parsedBudget)&&parsedBudget>=1&&parsedBudget<=240?{budgetMinutes:Math.floor(parsedBudget)}:{} )
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
  setStatus("Local session started.");
 };

 const startCommitment=async()=>{
  const target=normalizeDomain(commitDomain);
  const minutes=Number(commitMinutes);
  if(!target||!Number.isInteger(minutes)||minutes<1||minutes>240){
   setStatus("Enter a valid site and commitment length.");
   return;
  }
  const now=Date.now();
  const existing=profile.commitments.find(c=>c.endAt>now&&c.targetDomains.some(d=>normalizeDomain(d)===target));
  if(existing){
   setStatus("An active commitment already protects this destination. Review it below before creating another.");
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
  setStatus("Commitment started locally and attached to the active session.");
 };

 const endCommitment=async(id:string)=>{
  const selected=profile.commitments.find(c=>c.id===id);
  if(!selected)return;
  const now=Date.now();
  const inChangeWindow=now>=selected.startAt&&now<selected.startAt+selected.changeCooldownMinutes*60_000;
  if(inChangeWindow){
   setStatus("This commitment is in its protected change window. You can review it, but cannot end it yet.");
   return;
  }
  const nextProfile={...profile,commitments:profile.commitments.filter(c=>c.id!==id)};
  setProfile(nextProfile);
  await profileStore.set(nextProfile);
  if(runtime)runtime.setConfig({commitments:nextProfile.commitments});
  setStatus("Commitment ended and the active session policy was updated.");
 };

 const finishSetup=async()=>{
  const targetDomains=domains.split(",").map(normalizeDomain).filter(Boolean).slice(0,30);
  if(!intent.trim()||targetDomains.length===0){setStatus("Add your intention and at least one protected destination.");return;}
  const now=Date.now();
  const currentIntent:LocalIntent={id:now.toString(36),label:intent.trim().slice(0,120),purpose,targetDomains,startedAt:now,...(Number.isFinite(Number(budget))&&Number(budget)>=1&&Number(budget)<=240?{budgetMinutes:Math.floor(Number(budget))}:{})};
  const nextProfile={...profile,intent:currentIntent,protectionMode:mode,redirectShelf};
  setProfile(nextProfile); await profileStore.set(nextProfile); setSetupFinished(true); setSetupStep(0); setStatus("Your local protection profile is ready.");
 };
 const setupNext=()=>{
  if(setupStep===1 && !intent.trim()){setStatus("Give your protection plan an intention.");return;}
  if(setupStep===2 && domains.split(",").map(normalizeDomain).filter(Boolean).length===0){setStatus("Add at least one destination to protect.");return;}
  if(setupStep<3)setSetupStep(setupStep+1);else void finishSetup();
 };
 const setupBack=()=>setSetupStep(Math.max(0,setupStep-1));

 const recoveredMinutes=Math.round((summary.attentionRecoveredSeconds??0)/60);
 const sessionSeconds=runtime&&profile.intent?Math.max(0,Math.floor((sessionNow-profile.intent.startedAt)/1000)):0;
 const sessionMinutes=Math.floor(sessionSeconds/60);
 const sessionRemainder=String(sessionSeconds%60).padStart(2,"0");
 const sessionBudget=profile.intent?.budgetMinutes??0;
 const sessionProgress=sessionBudget?Math.min(100,Math.round((sessionSeconds/(sessionBudget*60))*100)):0;

 if(loadError)setStatus("Local persistence is unavailable right now. Your setup can still continue; we will retry storage when you save.");
 if(!hydrated)return <main className="onboarding-page"><div className="onboarding-card"><span className="setup-mark">AF</span><p className="eyebrow">ATTENTION FIREWALL</p><h1>Preparing your private control center.</h1><p>Local configuration is loading in the background. Your attention data never needs to leave this device.</p></div></main>;
 if(!setupFinished)return <main className="onboarding-page">
  <div className="onboarding-top"><div className="brand"><span className="mark">AF</span><div><strong>ATTENTION FIREWALL</strong><small>privacy-first attention control</small></div></div><span className="privacy">LOCAL SETUP · {setupStep+1}/4</span></div>
  <div className="setup-layout"><aside className="setup-aside"><p className="eyebrow">YOUR FIRST 2 MINUTES</p><h1>Make distraction harder.<br/><em>Make intention easier.</em></h1><p>Attention Firewall is not a screen-time scoreboard. It creates deliberate friction at the moment your attention starts to drift, then gives you somewhere useful to go.</p><div className="setup-points"><span>01 · Set your intention</span><span>02 · Define what to protect</span><span>03 · Choose your recovery path</span><span>04 · Keep the sensitive loop local</span></div></aside>
  <section className="setup-panel">
   <div className="setup-progress"><i className={setupStep>=0?"active":""}/><i className={setupStep>=1?"active":""}/><i className={setupStep>=2?"active":""}/><i className={setupStep>=3?"active":""}/></div>
   {setupStep===0&&<div className="setup-step"><span className="step-kicker">START WITH WHY</span><h2>What are you protecting today?</h2><p>Choose the kind of attention you want the Firewall to defend. You can change this later.</p><div className="choice-grid">{(["work","study","communication","entertainment","rest","other"] as Purpose[]).map(p=><button key={p} type="button" className={purpose===p?"choice selected":"choice"} onClick={()=>applyPreset(p)}><b>{p}</b><small>{p==="work"?"Deep work and projects":p==="study"?"Learning and revision":p==="communication"?"Essential messages and calls":p==="entertainment"?"A deliberate break":"A calmer, intentional day"}</small></button>)}</div></div>}
   {setupStep===1&&<div className="setup-step"><span className="step-kicker">01 · YOUR INTENTION</span><h2>What should win when distraction appears?</h2><p>Write the action you actually want to return to. This becomes the language of your interventions.</p><label>YOUR INTENTION<input autoFocus value={intent} onChange={e=>setIntent(e.target.value)} maxLength={120} placeholder="e.g. Finish the report before lunch"/></label><label>FOCUS BUDGET <div className="unit-input"><input value={budget} onChange={e=>setBudget(e.target.value)} type="number" min="1" max="240"/><span>minutes</span></div></label></div>}
   {setupStep===2&&<div className="setup-step"><span className="step-kicker">02 · PROTECTION BOUNDARY</span><h2>Where does your attention usually leak?</h2><p>Start with the places you want the Firewall to protect. Enter domains separated by commas. The browser layer only acts on destinations you explicitly choose.</p><label>PROTECTED DESTINATIONS<input autoFocus value={domains} onChange={e=>setDomains(e.target.value)} placeholder="instagram.com, tiktok.com, youtube.com"/></label><div className="privacy-callout"><b>LOCAL BY DESIGN</b><span>The Firewall does not need to read page contents, messages, passwords or browsing history to intervene.</span></div></div>}
   {setupStep===3&&<div className="setup-step"><span className="step-kicker">03 · RECOVERY PATH</span><h2>When we interrupt you, where should you go?</h2><p>Pick the useful destinations you want offered instead of continuing the distraction.</p><div className="recovery-choice-grid">{([["tasks","To-Do List","Handle the next concrete task"],["notes","Notes","Capture the thought and move on"],["calendar","Calendar","Check what you planned next"],["current-task","Current task","Return to the work already in progress"]] as const).map(([key,title,desc])=><button key={key} type="button" className={redirectShelf.includes(key)?"recovery-choice selected":"recovery-choice"} onClick={()=>{const next=redirectShelf.includes(key)?redirectShelf.filter(x=>x!==key):[...redirectShelf,key];if(next.length)setRedirectShelf(next)}}><span>{redirectShelf.includes(key)?"✓":"+"}</span><b>{title}</b><small>{desc}</small></button>)}</div><div className="privacy-callout"><b>YOUR DATA</b><span>Detailed attention state stays on this device. Cloud sync is not required for the protection loop.</span></div></div>}
   <div className="setup-actions">{setupStep>0&&<button type="button" className="setup-back" onClick={setupBack}>Back</button>}<button type="button" className="setup-primary" onClick={setupNext}>{setupStep===3?"Enter Attention Firewall":"Continue"}</button></div>
   {status&&<p className="status-line" role="status">{status}</p>}
  </section></div>
 </main>;

 return <main className="shell">
  <header>
   <div className="brand"><span className="mark">AF</span><div><strong>ATTENTION FIREWALL</strong><small>privacy-first attention control</small></div></div>
   <nav style={{display:"flex",gap:8,alignItems:"center"}}><a href="/insights">Insights</a><a href="/account">Security</a><a href="/privacy">Privacy</a><span className="privacy">LOCAL MODE · ON</span></nav>
  </header>

  <section className="hero">
   <div>
    <p className="eyebrow">YOUR ATTENTION</p>
    <h1>Protect your intention.<br/><em>Not just your time.</em></h1>
    <p className="sub">Detailed attention state is processed locally. The cloud is not required for the protection loop.</p><p className="preview-note">The dashboard is a control plane. Protection decisions are made locally by the device and browser components.</p><div className="hero-badges"><span>LOCAL ENGINE</span><span>ENCRYPTED LOCAL STATE</span><span>NO BEHAVIORAL CLOUD LOG</span></div>
   </div>
   <div className="score"><span>PROTECTION STATE</span><b>ON</b><small>local control plane</small></div>
  </section>

  <section className="today-strip">
   <div><span>PASSIVE TODAY</span><b>{Math.round(summary.passiveSeconds/60)}m</b></div>
   <div><span>INTENTIONAL</span><b>{Math.round(summary.intentionalSeconds/60)}m</b></div>
   <div><span>RECOVERED</span><b>{Math.round(summary.attentionRecoveredSeconds/60)}m</b></div>
   <div><span>DRIFT EPISODES</span><b>{summary.driftEpisodes}</b></div>
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
    <div className="preset-row"><span>QUICK START</span>{(["work","study","communication","entertainment"] as Purpose[]).map(p=><button key={p} type="button" className="preset-button" onClick={()=>applyPreset(p)}>{p}</button>)}</div>
    <button onClick={()=>void start()}>{runtime?"Restart local session":"Start local session"}</button>
   </article>

   <article className="card">
    <div className="label">LOCAL SESSION</div>
    <div className="session-header"><div><span className="session-time">{sessionMinutes}:{sessionRemainder}</span><small>{sessionBudget?`${sessionProgress}% of ${sessionBudget} min budget`:"open session"}</small></div>{runtime&&<button className="secondary-button session-end" onClick={()=>void endSession()}>End session</button>}</div>
    {runtime&&sessionBudget>0&&<div className="session-progress"><div style={{width:`${sessionProgress}%`}}/></div>}
    <h2>{runtime?"Session active":"Ready for a local session"}</h2>
    <p>{runtime?"Waiting for real device/browser signals. No behavioral state is fabricated by this dashboard.":"Start a local session to define the attention boundary. Enforcement signals come from the connected device or browser component."}</p>
   </article>

   <article className="card">
    <div className="label">ATTENTION TWIN</div>
    <h2>{twin.preferredIntervention}</h2>
    <p>{twin.sampleDays} local day(s) modeled · {twin.highRiskHours.length?twin.highRiskHours.map(h=>String(h).padStart(2,"0")+":00").join(", "):"high-risk windows not learned yet"}</p><div className="metric-row"><span>Consistency</span><b>{Math.round(twin.consistency*100)}%</b></div>
    <p>{recoveredMinutes} min attention recovered</p><p>{profile.commitments.filter(x=>x.endAt>Date.now()).length} active local commitments</p>
   </article>

   <article className="card">
    <div className="label">COMMITMENT · LOCAL</div>
    <input value={commitDomain} onChange={e=>setCommitDomain(e.target.value)} placeholder="Site to protect, e.g. social.example"/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <input value={commitMinutes} onChange={e=>setCommitMinutes(e.target.value)} type="number" min="1" max="240" placeholder="Minutes"/>
      <select value={commitLevel} onChange={e=>setCommitLevel(e.target.value as Commitment["minimumIntervention"])}><option value="pause">Pause</option><option value="delay">Delay</option><option value="commitment">Commitment</option><option value="lock">Lock</option></select>
    </div>
    <p>Set the rule while calm. It will be enforced locally until the commitment expires. Active commitments are attached to the current session policy.</p>
    <button onClick={()=>void startCommitment()}>Start commitment</button>
    <div className="commitment-list">{profile.commitments.filter(c=>c.endAt>Date.now()).map(c=>{
      const remaining=Math.max(0,Math.ceil((c.endAt-Date.now())/60000));
      const locked=Date.now()<c.startAt+c.changeCooldownMinutes*60_000;
      return <div key={c.id} className="commitment-item"><div><b>{c.targetDomains.join(", ")}</b><small>{c.minimumIntervention} · {remaining} min remaining{locked?" · protected change window":""}</small></div><button type="button" className="secondary-button" disabled={locked} onClick={()=>void endCommitment(c.id)}>End</button></div>;
    })}</div>
   </article>

   <article className="card">
    <div className="label">YOUR INTENTIONAL APPS · LOCAL</div>
    <h2>Make the next action easier.</h2>
    <p>Choose the destinations the Firewall may offer when it redirects a distraction. This preference stays on this device.</p>
    <div className="preset-row">
      {([["tasks","To-Do List"],["notes","Notes"],["calendar","Calendar"],["current-task","Current task"]] as const).map(([key,label])=>{
        const checked=redirectShelf.includes(key);
        return <button key={key} type="button" className="preset-button" aria-pressed={checked} onClick={()=>{
          const next=checked?redirectShelf.filter(x=>x!==key):[...redirectShelf,key];
          if(next.length===0)return;
          setRedirectShelf(next);
          const nextProfile={...profile,redirectShelf:next};
          setProfile(nextProfile);
          void profileStore.set(nextProfile);
        }}>{checked?"✓ ":""}{label}</button>;
      })}
    </div>
    <p className="preview-note">On Android, available installed destinations are offered locally. The web control plane does not receive your app activity.</p>
   </article>
   <article className="card recovery">
    <div className="label">RECOVERY</div>
    <h2>{recoveredMinutes ? "Use recovered attention deliberately." : "Recovery appears after a local intervention."}</h2>
    <p>Leaving the loop is only half the job. Attention Firewall helps convert recovered time into a concrete next action.</p>
    <div className="recovery-actions"><a href="/insights">Open local insights</a><a href="/privacy">Review privacy controls</a></div>
   </article>
  </section>

  {status&&<p className="status-line" role="status">{status}</p>}
  <footer><span>Detailed behavioral state stays on this device.</span><a href="/privacy">Privacy Center →</a></footer>
 </main>;
}
