export type RecoveryKind="micro-reset"|"priority"|"movement"|"reading"|"break"|"return-to-intent";
export interface RecoveryContext{
 minutesRecovered:number;
 intentPurpose:"work"|"study"|"communication"|"entertainment"|"rest"|"other";
 timeOfDay:"morning"|"day"|"evening"|"night";
 consecutiveDriftEpisodes:number;
}
export interface RecoveryAction{
 kind:RecoveryKind;
 title:string;
 durationMinutes:number;
 rationale:string;
}
export function recommendRecovery(c:RecoveryContext):RecoveryAction[]{
 const out:RecoveryAction[]=[];
 if(c.minutesRecovered>=2)out.push({kind:"micro-reset",title:"Reset for two minutes",durationMinutes:2,rationale:"A short reset creates a clean transition out of passive consumption."});
 if(c.intentPurpose==="work"||c.intentPurpose==="study")out.push({kind:"return-to-intent",title:"Return to your original intention",durationMinutes:Math.min(10,Math.max(3,c.minutesRecovered)),rationale:"Use the recovered attention on the task you originally declared."});
 if(c.timeOfDay==="day"&&c.minutesRecovered>=10)out.push({kind:"movement",title:"Move for ten minutes",durationMinutes:10,rationale:"A brief physical change can create a stronger boundary after a drift episode."});
 if(c.intentPurpose==="rest"||c.timeOfDay==="night")out.push({kind:"break",title:"Put the phone away",durationMinutes:10,rationale:"Night-time drift is often better interrupted by reducing digital stimulation rather than opening another app."});
 if(c.consecutiveDriftEpisodes>=3)out.unshift({kind:"priority",title:"Choose one offline priority",durationMinutes:5,rationale:"Repeated drift is a signal to simplify the next action instead of adding more choices."});
 return dedupe(out).slice(0,4);
}
function dedupe(items:RecoveryAction[]){
 const seen=new Set<RecoveryKind>();return items.filter(item=>{if(seen.has(item.kind))return false;seen.add(item.kind);return true;});
}