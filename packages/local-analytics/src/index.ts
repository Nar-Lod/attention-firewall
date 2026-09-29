export interface DailySummary{
 date:string;
 intentionalSeconds:number;
 passiveSeconds:number;
 driftEpisodes:number;
 interventionsShown:number;
 interventionsAccepted:number;
 attentionRecoveredSeconds:number;
}
export function todayKey(date=new Date()):string{
 const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,"0");const d=String(date.getDate()).padStart(2,"0");
 return y+"-"+m+"-"+d;
}
export function emptyDay(date=todayKey()):DailySummary{
 return {date,intentionalSeconds:0,passiveSeconds:0,driftEpisodes:0,interventionsShown:0,interventionsAccepted:0,attentionRecoveredSeconds:0};
}
export function addDailySeconds(summary:DailySummary,field:"intentionalSeconds"|"passiveSeconds"|"attentionRecoveredSeconds",seconds:number):DailySummary{
 if(!Number.isFinite(seconds)||seconds<0)throw new Error("seconds must be non-negative");
 return {...summary,[field]:Math.min(summary[field]+seconds,86400)};
}
export function recordInterventionShown(summary:DailySummary):DailySummary{
 return {...summary,interventionsShown:Math.min(summary.interventionsShown+1,1000)};
}
export function recordInterventionOutcome(summary:DailySummary,accepted:boolean):DailySummary{
 return {...summary,interventionsAccepted:Math.min(summary.interventionsAccepted+(accepted?1:0),summary.interventionsShown)};
}
export function recordIntervention(summary:DailySummary,accepted:boolean):DailySummary{
 return recordInterventionOutcome(recordInterventionShown(summary),accepted);
}
export function recordDriftEpisode(summary:DailySummary):DailySummary{
 return {...summary,driftEpisodes:Math.min(summary.driftEpisodes+1,1000)};
}
export * from "./history.js";
