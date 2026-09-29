import {describe,expect,it} from "vitest";
import {sweepLocalState} from "../src/index.js";
import {emptyDay} from "@attention-firewall/local-analytics";

describe("local data lifecycle",()=>{
 it("removes expired commitments",()=>{
  const now=1_000_000;
  const state={
   dailyHistory:{version:1 as const,days:[emptyDay("2026-09-29")]},
   commitments:[{id:"c",label:"x",targetDomains:["example.com"],startAt:0,endAt:now-1,minimumIntervention:"pause" as const,changeCooldownMinutes:5,createdAt:0}],
   interventionProfile:{successByIntervention:{pause:9},attemptsByIntervention:{pause:4}}
  };
  const result=sweepLocalState(state,now);
  expect(result.commitments).toHaveLength(0);
  expect(result.interventionProfile.successByIntervention.pause).toBe(4);
 });
});
