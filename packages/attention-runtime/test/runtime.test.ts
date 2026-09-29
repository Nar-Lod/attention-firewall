import {describe,expect,it} from "vitest";
import {AttentionRuntime} from "../src/index.js";
import {emptyDay,addDailySeconds} from "@attention-firewall/local-analytics";

function config(){
 return {
  protectionMode:"adaptive" as const,
  profile:{successByIntervention:{},attemptsByIntervention:{}},
  intent:{id:"1",label:"study",purpose:"study" as const,targetDomains:["example.com"],startedAt:0}
 };
}

describe("AttentionRuntime",()=>{
 it("produces a local decision from coarse samples",()=>{
  let now=1_000_000;
  const rt=new AttentionRuntime(config(),{now:()=>now});
  rt.begin("example.com");
  const r=rt.sample({elapsedSeconds:60,interactions:2,scrolls:40,intentMatch:1,outsideIntent:false});
  expect(r.session.elapsedSeconds).toBe(60);
  expect(r.dailySummary.passiveSeconds).toBe(60);
  expect(["none","awareness","deliberation","pause","delay","commitment","lock"]).toContain(r.intervention);
 });
 it("preserves an externally persisted aggregate",()=>{
  const existing=addDailySeconds(emptyDay(),"passiveSeconds",120);
  const rt=new AttentionRuntime(config(),undefined,existing);
  rt.begin("example.com");
  const r=rt.sample({elapsedSeconds:60,interactions:0,scrolls:4,intentMatch:1,outsideIntent:false});
  expect(r.dailySummary.passiveSeconds).toBe(180);
 });
 it("learns intervention responses locally without network access",()=>{
  const rt=new AttentionRuntime(config());
  rt.begin("example.com");
  rt.respond("deliberation","exited");
  rt.respond("deliberation","continued");
  expect(rt.getSummary().interventionsShown).toBe(2);
  expect(rt.getSummary().interventionsAccepted).toBe(1);
 });
 it("times out inactive sessions",()=>{
  let now=1000;
  const rt=new AttentionRuntime(config(),{now:()=>now});
  rt.begin("example.com");
  now+=301_000;
  expect(rt.isTimedOut()).toBe(true);
 });
});
