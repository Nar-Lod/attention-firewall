import {describe,expect,it} from "vitest";
import {applyPolicy,validateRules} from "../src/index.js";

describe("policy engine",()=>{
  it("applies site-specific minimum intervention",()=>{
    const rules=[{id:"r1",target:"site" as const,value:"example.com",enabled:true,minimumIntervention:"pause" as const}];
    expect(applyPolicy("none",rules,{domain:"www.example.com",minuteOfDay:600})).toBe("pause");
  });
  it("supports overnight windows",()=>{
    const rules=[{id:"r1",target:"all-web" as const,value:"all",enabled:true,minimumIntervention:"awareness" as const,startMinute:1380,endMinute:120}];
    expect(applyPolicy("none",rules,{domain:"example.com",minuteOfDay:30})).toBe("awareness");
  });
  it("rejects malformed rules",()=>expect(()=>validateRules([{id:"r1",target:"bad",value:"x",enabled:true,minimumIntervention:"lock"}])).toThrow());
});
