import {describe,expect,it} from "vitest";
import {budgetStatus,matchDomain,normalizeDomain,sanitizeIntent} from "../src/index.js";

describe("intent engine",()=>{
  it("normalizes domains safely",()=>expect(normalizeDomain("https://www.Example.com/path")).toBe("example.com"));
  it("matches subdomains",()=>{
    const intent={id:"1",label:"Study",purpose:"study" as const,targetDomains:["example.com"],startedAt:0};
    expect(matchDomain(intent,"docs.example.com").matches).toBe(true);
    expect(matchDomain(intent,"other.test").matches).toBe(false);
  });
  it("classifies intent budgets",()=>{
    const intent={id:"1",label:"Study",purpose:"study" as const,targetDomains:["example.com"],startedAt:0,budgetMinutes:30};
    expect(budgetStatus(intent,1500)).toBe("approaching");
    expect(budgetStatus(intent,1801)).toBe("exceeded");
  });
  it("rejects malformed intents",()=>expect(sanitizeIntent({id:"1",label:"x",purpose:"study",targetDomains:["bad domain"],startedAt:0})).toBeUndefined());
});
