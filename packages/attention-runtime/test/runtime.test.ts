import {describe,expect,it} from "vitest";
import {AttentionRuntime} from "../src/index.js";
import {emptyDay,addDailySeconds} from "@attention-firewall/local-analytics";

function config(){
 return {
  protectionMode:"adaptive" as const,
  profile:{successByIntervention:{},attemptsByIntervention:{}},
  rules:[],
  intent:{id:"1",label:"study",purpose:"study" as const,targetDomains:["example.com"],startedAt:0}
 };
}

describe("AttentionRuntime",()=>{
 it("produces a local decision from coarse samples",()=>{
  let now=1_000_000;
  const rt=new AttentionRuntime(config(),{now:()=>now});
  rt.begin("example.com");
  const r=rt.sample({elapsedSeconds:60,interactions:2,scrolls:40,domain:"example.com"});
  expect(r.session.elapsedSeconds).toBe(60);
  expect(r.dailySummary.passiveSeconds).toBe(60);
  expect(["none","awareness","deliberation","pause","delay","commitment","lock"]).toContain(r.intervention);
 });
 it("preserves an externally persisted aggregate",()=>{
  const existing=addDailySeconds(emptyDay(),"passiveSeconds",120);
  const rt=new AttentionRuntime(config(),undefined,existing);
  rt.begin("example.com");
  const r=rt.sample({elapsedSeconds:60,interactions:0,scrolls:4,domain:"example.com"});
  expect(r.dailySummary.passiveSeconds).toBe(180);
 });
 it("counts intervention shown separately from outcome",()=>{
  const rt=new AttentionRuntime(config());
  rt.begin("example.com");
  const r=rt.sample({elapsedSeconds:600,interactions:0,scrolls:300,domain:"example.com",lateNightRisk:1});
  expect(r.dailySummary.interventionsShown).toBeGreaterThanOrEqual(1);
  const before=r.dailySummary.interventionsAccepted;
  if(r.intervention!=="none")rt.respond(r.intervention,"exited");
  expect(rt.getSummary().interventionsAccepted).toBe(before+1);
 });
 it("times out inactive sessions",()=>{
  let now=1000;
  const rt=new AttentionRuntime(config(),{now:()=>now});
  rt.begin("example.com");
  now+=301_000;
  expect(rt.isTimedOut()).toBe(true);
 });
});
