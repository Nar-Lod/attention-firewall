import {describe,expect,it} from "vitest";
import {buildAttentionTwin} from "../src/index.js";
describe("attention twin",()=>{
 it("prefers the locally successful intervention",()=>{
  const twin=buildAttentionTwin([{date:"2026-09-29",intentionalSeconds:0,passiveSeconds:0,driftEpisodes:1,interventionsShown:3,interventionsAccepted:2,attentionRecoveredSeconds:120,driftByHour:Array.from({length:24},(_,i)=>i===23?4:0)}],{attemptsByIntervention:{pause:4,awareness:2},successByIntervention:{pause:3,awareness:1}});
  expect(twin.preferredIntervention).toBe("pause");
  expect(twin.highRiskHours).toContain(23);
 });
});
