import {describe,expect,it} from "vitest";
import {buildSyncableSettings} from "../src/index.js";

describe("syncable settings allowlist",()=>{
 it("keeps explicit configuration",()=>{
  const result=buildSyncableSettings({
   protectionMode:"strict",
   currentIntent:{id:"i1",label:"Study",purpose:"study",targetDomains:["example.com"],budgetMinutes:30},
   rules:[{id:"r1",target:"site",value:"example.com",enabled:true,minimumIntervention:"pause"}],
   commitments:[{id:"c1",label:"Focus",targetDomains:["example.com"],startAt:1,endAt:2,minimumIntervention:"delay",changeCooldownMinutes:5,createdAt:0}]
  });
  expect(result.protectionMode).toBe("strict");
  expect(result.rules).toHaveLength(1);
  expect(result.commitments).toHaveLength(1);
 });

 it("does not include behavioral history, learned profile or security logs",()=>{
  const result=buildSyncableSettings({
   protectionMode:"adaptive",
   dailyHistory:[{date:"2026-09-29",driftEpisodes:99}],
   dailySummary:{passiveSeconds:9999},
   interventionProfile:{successByIntervention:{lock:99},attemptsByIntervention:{lock:100}},
   securityEvents:[{type:"login_failed",occurredAt:1}],
   currentIntent:{id:"i1",label:"Study",purpose:"study",targetDomains:["example.com"]}
  });
  expect(result).not.toHaveProperty("dailyHistory");
  expect(result).not.toHaveProperty("dailySummary");
  expect(result).not.toHaveProperty("interventionProfile");
  expect(result).not.toHaveProperty("securityEvents");
 });
});
