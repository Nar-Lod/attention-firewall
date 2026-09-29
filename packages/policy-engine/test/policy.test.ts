import {describe,expect,it} from "vitest";import {applyPolicy,ruleApplies} from "../src/index.js";
describe("policy engine",()=>{
 it("applies time windows locally",()=>{
  const rule={id:"night",target:"all-web" as const,value:"*",enabled:true,minimumIntervention:"pause" as const,startMinute:1320,endMinute:360};
  expect(ruleApplies(rule,{domain:"example.com",minuteOfDay:23*60})).toBe(true);
  expect(ruleApplies(rule,{domain:"example.com",minuteOfDay:12*60})).toBe(false);
 });
 it("can impose a user-selected minimum friction level",()=>{
  const rules=[{id:"study",target:"site" as const,value:"social.example",enabled:true,minimumIntervention:"pause" as const}];
  expect(applyPolicy("awareness",rules,{domain:"social.example",minuteOfDay:600})).toBe("pause");
 });
});
