import type {InterventionProfile} from "@attention-firewall/attention-engine";
import type {DailySummary} from "@attention-firewall/local-analytics";

export interface AttentionTwin{
 version:1;
 sampleDays:number;
 preferredIntervention:string;
 interventionSuccess:Record<string,number>;
 highRiskHours:number[];
 attentionRecoveredSeconds:number;
 consistency:number;
}

export function buildAttentionTwin(days:DailySummary[],profile:InterventionProfile):AttentionTwin{
 const recent=days.slice(0,30);
 const success:Record<string,number>={};
 for(const [key,attempts] of Object.entries(profile.attemptsByIntervention)){
  const completed=profile.successByIntervention[key]??0;
  if(attempts>0)success[key]=completed/attempts;
 }
 const ranked=Object.entries(success).sort((a,b)=>b[1]-a[1]);
 const hourly=new Array(24).fill(0) as number[];
 for(const day of recent){
  for(let hour=0;hour<24;hour++)hourly[hour]+=day.driftByHour?.[hour]??0;
 }
 const sortedHours=hourly.map((count,hour)=>({count,hour})).sort((a,b)=>b.count-a.count);
 const max=sortedHours[0]?.count??0;
 const highRiskHours=max>0?sortedHours.filter(x=>x.count>0&&x.count>=Math.max(1,max*.6)).map(x=>x.hour).sort((a,b)=>a-b):[];
 const consistency=recent.length===0?0:1-(Math.min(recent.filter(x=>x.driftEpisodes>0).length,recent.length)/recent.length);
 return {
  version:1,
  sampleDays:recent.length,
  preferredIntervention:ranked[0]?.[0]??"awareness",
  interventionSuccess:success,
  highRiskHours,
  attentionRecoveredSeconds:recent.reduce((sum,day)=>sum+day.attentionRecoveredSeconds,0),
  consistency:Math.max(0,Math.min(1,consistency))
 };
}
