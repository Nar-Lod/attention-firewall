import {describe,expect,it} from "vitest";
import {assessAttention,chooseIntervention,detectPassiveScrollLoop} from "../src/index.js";

const base={sessionSeconds:180,repeatedOpens:0,recentReopens:0,passiveSeconds:30,interactionRate:.5,scrollEventsPerMinute:4,contextSwitches:0,declaredIntentMatch:1,outsideIntent:false,lateNightRisk:0,notificationLaunch:false,previousInterventionIgnored:false};

describe("Attention Drift Engine",()=>{
 it("keeps an intentional short session low-risk",()=>{const r=assessAttention(base);expect(r.score).toBeLessThan(.15);expect(r.state).toBe("focused");});
 it("detects a drifting passive session",()=>{const r=assessAttention({...base,sessionSeconds:1800,recentReopens:4,passiveSeconds:1500,interactionRate:.01,scrollEventsPerMinute:35,contextSwitches:5,declaredIntentMatch:.1,outsideIntent:true,lateNightRisk:.8,notificationLaunch:true,previousInterventionIgnored:true});expect(r.score).toBeGreaterThan(.65);expect(r.state).toBe("compulsive-risk");});
 it("starts with low friction",()=>{const r=chooseIntervention({score:.52,state:"drifting",reasons:["passive"]},{successByIntervention:{},attemptsByIntervention:{}});expect(r.intervention).toBe("deliberation");});
 it("escalates when intervention repeatedly fails",()=>{const r=chooseIntervention({score:.52,state:"drifting",reasons:["passive"]},{successByIntervention:{deliberation:0},attemptsByIntervention:{deliberation:4}});expect(r.intervention).toBe("pause");});
 it("detects passive-scroll loops separately from generic attention score",()=>{const r=detectPassiveScrollLoop({...base,sessionSeconds:600,scrollEventsPerMinute:30,interactionRate:.04,recentReopens:3,declaredIntentMatch:0,outsideIntent:true,lateNightRisk:1});expect(r.detected).toBe(true);expect(r.confidence).toBeGreaterThan(.5);});
});
