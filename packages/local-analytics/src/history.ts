import type {DailySummary} from "./index.js";
import {emptyDay,todayKey} from "./index.js";

export interface DailyHistory{version:1;days:DailySummary[]}
export const DEFAULT_HISTORY:DailyHistory={version:1,days:[]};

export function upsertDay(history:DailyHistory,summary:DailySummary,maxDays=30):DailyHistory{
 if(history.version!==1)throw new Error("unsupported history version");
 const days=history.days.filter(day=>day.date!==summary.date);
 days.unshift({...summary});
 return {version:1,days:days.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,maxDays)};
}

export function pruneHistory(history:DailyHistory,maxDays=30,today=todayKey()):DailyHistory{
 const threshold=new Date(today+"T00:00:00");
 threshold.setDate(threshold.getDate()-(maxDays-1));
 const minDate=threshold.toISOString().slice(0,10);
 return {version:1,days:history.days.filter(day=>day.date>=minDate).slice(0,maxDays)};
}

export function currentDay(history:DailyHistory):DailySummary{
 return history.days.find(day=>day.date===todayKey())??emptyDay();
}
