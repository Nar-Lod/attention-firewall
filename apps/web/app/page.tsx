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
 const [redirectShelf,setRedirectShelf]=useState<RedirectDestination[]>(blankProfile.redirectShelf);
 const [runtime,setRuntime]=useState<AttentionRuntime|null>(null);
 const [summary,setSummary]=useState(emptyDay());
 const [history,setHistory]=useState<DailyHistory>({version:1,days:[]});
 const [status,setStatus]=useState("");
 const [sessionNow,setSessionNow]=useState(Date.now());

 useEffect(()=>{
  if(!runtime)return;
  const timer=window.setInterval(()=>setSessionNow(Date.now()),1000);
  return ()=>window.clearInterval(timer);
 },[runtime]);

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
   setRedirectShelf(stored.redirectShelf??blankProfile.redirectShelf);
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

 const applyPreset=(preset:Purpose)=>{
  const presets:Record<Purpose,{intent:string;budget:string;domains:string}>={work:{intent:"Finish focused work",budget:"45",domains:"docs.example.com, github.com"},study:{intent:"Complete a focused study block",budget:"40",domains:"docs.example.com, wikipedia.org"},communication:{intent:"Handle essential communication",budget:"25",domains:"mail.example.com, calendar.example.com"},entertainment:{intent:"Take a deliberate entertainment break",budget:"30",domains:"video.example.com"},rest:{intent:"Rest without attention drift",budget:"30",domains:"music.example.com"},other:{intent:"Complete one intentional task",budget:"30",domains:"example.com"}};
  const selected=presets[preset];
  setPurpose(preset);setIntent(selected.intent);setBudget(selected.budget);setDomains(selected.domains);setStatus("Preset loaded locally. Review it before starting.");
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

 const recoveredMinutes=Math.round((summary.attentionRecoveredSeconds??0)/60);
 const sessionSeconds=runtime&&profile.intent?Math.max(0,Math.floor((sessionNow-profile.intent.startedAt)/1000)):0;
 const sessionMinutes=Math.floor(sessionSeconds/60);
 const sessionRemainder=String(sessionSeconds%60).padStart(2,"0");
 const sessionBudget=profile.intent?.budgetMinutes??0;
 const sessionProgress=sessionBudget?Math.min(100,Math.round((sessionSeconds/(sessionBudget*60))*100)):0;

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
    <button onClick={start}>Start local session</button>
   </article>

   <article className="card">
    <div className="label">LOCAL SESSION</div>
    <div className="session-header"><div><span className="session-time">{sessionMinutes}:{sessionRemainder}</span><small>{sessionBudget?`${sessionProgress}% of ${sessionBudget} min budget`:"open session"}</small></div>{runtime&&<button className="secondary-button session-end" onClick={()=>{setRuntime(null);setStatus("Local session ended. Your saved history remains on this device.");}}>End session</button>}</div>
    {runtime&&sessionBudget>0&&<div className="session-progress"><div style={{width:`${sessionProgress}%`}}/></div>}
    <h2>{runtime?"Session active":"Ready for a local session"}</h2>
    <p>{runtime?"Waiting for real device/browser signals. No behavioral state is fabricated by this dashboard.":"Start a local session to define the attention boundary. Enforcement signals come from the connected device or browser component.</p>}
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
    <p>Set the rule while calm. It will be enforced locally until the commitment expires.</p>
    <button onClick={startCommitment}>Start commitment</button>
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
