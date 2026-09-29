import {describe,expect,it} from "vitest";
import {applyCommitments,commitmentStatus,validateCommitment} from "../src/index.js";

describe("commitment engine",()=>{
  const now=1_000_000;
  const commitment={id:"c1",label:"Protect",targetDomains:["example.com"],startAt:now,endAt:now+60_000,minimumIntervention:"lock" as const,changeCooldownMinutes:5,createdAt:now};
  it("validates commitments",()=>expect(validateCommitment(commitment)).toEqual(commitment));
  it("reports active commitments",()=>expect(commitmentStatus(commitment,now).active).toBe(true));
  it("raises intervention while commitment is active",()=>expect(applyCommitments("none",[commitment],"example.com",now)).toBe("lock"));
  it("does not apply expired commitments",()=>expect(applyCommitments("none",[commitment],"example.com",now+120_000)).toBe("none"));
});
