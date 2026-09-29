import {describe,expect,it} from "vitest";
import {applyCommitments,commitmentApplies,commitmentStatus,validateCommitment} from "../src/index.js";

const commitment={id:"c1",label:"No scrolling after 10pm",targetDomains:["social.example"],startAt:1_000_000,endAt:1_100_000,minimumIntervention:"commitment" as const,changeCooldownMinutes:15,createdAt:900_000};

describe("commitment engine",()=>{
 it("locks the early part of an active commitment",()=>{
  const result=commitmentStatus(commitment,1_005_000);
  expect(result.active).toBe(true);
  expect(result.locked).toBe(true);
 });
 it("matches subdomains locally",()=>expect(commitmentApplies(commitment,"m.social.example",1_005_000)).toBe(true));
 it("raises friction when an active commitment requires it",()=>{expect(applyCommitments("awareness",[commitment],"social.example",1_005_000)).toBe("commitment");});
 it("rejects malformed commitment state",()=>expect(()=>validateCommitment({...commitment,endAt:0})).toThrow());
});
