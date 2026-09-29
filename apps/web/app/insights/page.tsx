"use client";

import {useEffect,useMemo,useState} from "react";
import {EncryptedIndexedDbStore} from "@attention-firewall/secure-browser-store";
import type {DailyHistory} from "@attention-firewall/local-analytics";

function minutes(value:number){return Math.round(value/60);}
function pct(value:number){return Math.round(value*100);}

export default function InsightsPage(){
 const store=useMemo(()=>new EncryptedIndexedDbStore<DailyHistory>("history-v2","attention-firewall-web-history"),[]);
 const [history,setHistory]=useState<DailyHistory>({version:1,days:[]});

 useEffect(()=>{
  void store.get().then(value=>{if(value?.version===1)setHistory(value);});
 },[store]);

 const stats=useMemo(()=>{
  const days=history.days;
  const passive=days.reduce((sum,day)=>sum+day.passiveSeconds,0);
  const intentional=days.reduce((sum,day)=>sum+day.intentionalSeconds,0);
  const recovered=days.reduce((sum,day)=>sum+day.attentionRecoveredSeconds,0);
  const shown=days.reduce((sum,day)=>sum+day.interventionsShown,0);
  const accepted=days.reduce((sum,day)=>sum+day.interventionsAccepted,0);
  const drift=days.reduce((sum,day)=>sum+day.driftEpisodes,0);
  return {passive,intentional,recovered,shown,accepted,drift,exitRate:shown?accepted/shown:0};
 },[history]);

 const maxPassive=Math.max(...history.days.map(day=>day.passiveSeconds),1);

 return <main className="privacy-page">
  <a href="/">← Dashboard</a>
  <p className="eyebrow" style={{marginTop:32}}>LOCAL ANALYTICS</p>
  <h1>Attention Insights</h1>
  <p className="lead">These insights are calculated from coarse daily aggregates stored on this device. They cannot reconstruct your browsing timeline.</p>

  <section className="insight-metrics">
   <div className="privacy-card"><span className="label">PASSIVE</span><strong>{minutes(stats.passive)}m</strong><p>Across the last {history.days.length} stored day(s).</p></div>
   <div className="privacy-card"><span className="label">INTENTIONAL</span><strong>{minutes(stats.intentional)}m</strong><p>Time recorded within a declared intent.</p></div>
   <div className="privacy-card"><span className="label">RECOVERED</span><strong>{minutes(stats.recovered)}m</strong><p>Attention recovered after successful exits.</p></div>
   <div className="privacy-card"><span className="label">EXIT RATE</span><strong>{pct(stats.exitRate)}%</strong><p>{stats.accepted} accepted interventions of {stats.shown} shown.</p></div>
  </section>

  <section className="privacy-card chart-card">
   <div className="label">30-DAY PASSIVE TREND</div>
   <div className="bar-list">
    {history.days.map(day=>{
      const ratio=day.passiveSeconds/maxPassive;
      return <div key={day.date} className="bar-row"><span>{day.date.slice(5)}</span><div className="bar-track"><div className="bar-fill" style={{width:Math.max(2,ratio*100)+"%"}}/></div><b>{minutes(day.passiveSeconds)}m</b></div>;
    })}
    {!history.days.length&&<p className="muted">No local history yet.</p>}
   </div>
  </section>

  <section className="privacy-card">
   <div className="label">WHAT THE SYSTEM LEARNS</div>
   <p className="lead" style={{marginTop:12}}>{stats.drift} drift episode(s) are represented as coarse daily counts. The system can use these counts to improve your local Attention Twin without uploading the underlying sessions.</p>
  </section>
 </main>;
}
