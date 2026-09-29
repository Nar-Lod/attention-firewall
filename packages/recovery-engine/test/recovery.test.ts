import {describe,expect,it} from "vitest";import {recommendRecovery} from "../src/index.js";
describe("recovery engine",()=>{
 it("prioritizes the declared intention for focused work",()=>{
  const r=recommendRecovery({minutesRecovered:14,intentPurpose:"work",timeOfDay:"day",consecutiveDriftEpisodes:1});
  expect(r.some(x=>x.kind==="return-to-intent")).toBe(true);
 });
 it("adds a simplification step after repeated drift",()=>{
  const r=recommendRecovery({minutesRecovered:8,intentPurpose:"entertainment",timeOfDay:"night",consecutiveDriftEpisodes:3});
  expect(r[0]?.kind).toBe("priority");
 });
});
