import type {Intervention,InterventionProfile} from "@attention-firewall/attention-engine";
import type {DailySummary} from "@attention-firewall/local-analytics";

export interface AttentionTwin{
 version:1;
 sampleDays:number;
 preferredIntervention:Intervention;
 interventionSuccess:Partial<Record<Intervention,number>>;
 highRiskHours:number[];
 attentionRecoveredSeconds:number;
 consistency:number;
}

export function buildAttentionTwin(
 days:DailySummary[],
 profile:InterventionProfile
):AttentionTwin{
 const recent=days.slice(0,30);
 const success:Partial<Record<Intervention,number>>={};

 for(const [rawKey,attempts] of Object.entries(profile.attemptsByIntervention)){
  const key=rawKey as Intervention;
  const completed=profile.successByIntervention[key]??0;
  if(attempts>0)success[key]=completed/attempts;
 }

 const ranked=Object.entries(success) as Array<[Intervention,number]>;
 ranked.sort((a,b)=>b[1]-a[1]);

 const hourly=new Array(24).fill(0) as number[];
 for(const day of recent){
  for(let hour=0;hour<24;hour++){
   hourly[hour]=(hourly[hour]??0)+(day.driftByHour?.[hour]??0);
  }
 }

 const sortedHours=hourly
  .map((count,hour)=>({count,hour}))
  .sort((a,b)=>b.count-a.count);

 const max=sortedHours.at(0)?.count??0;
 const highRiskHours=max>0
  ?sortedHours
    .filter(x=>x.count>0&&x.count>=Math.max(1,max*.6))
    .map(x=>x.hour)
    .sort((a,b)=>a-b)
  :[];

 const driftDays=recent.filter(x=>x.driftEpisodes>0).length;
 const consistency=recent.length===0?0:1-(Math.min(driftDays,recent.length)/recent.length);

 return {
  version:1,
  sampleDays:recent.length,
  preferredIntervention:ranked.at(0)?.[0]??"awareness",
  interventionSuccess:success,
  highRiskHours,
  attentionRecoveredSeconds:recent.reduce(
   (sum,day)=>sum+(day.attentionRecoveredSeconds??0),
   0
  ),
  consistency:Math.max(0,Math.min(1,consistency))
 };
}
