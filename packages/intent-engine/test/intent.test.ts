import {describe,expect,it} from "vitest";import {normalizeDomain,matchDomain,budgetStatus} from "../src/index.js";
const intent={id:"1",label:"study",purpose:"study" as const,targetDomains:["docs.google.com","scholar.google.com"],startedAt:0,budgetMinutes:30};
describe("intent engine",()=>{
 it("normalizes domains without preserving URL paths",()=>expect(normalizeDomain("https://www.example.com/path?q=x")).toBe("example.com"));
 it("matches a subdomain without uploading or storing page data",()=>expect(matchDomain({...intent,targetDomains:["example.com"]},"learn.example.com").matches).toBe(true));
 it("detects outside-intent activity",()=>expect(matchDomain(intent,"social.example.net").reason).toBe("outside-target"));
 it("detects budget thresholds locally",()=>{expect(budgetStatus(intent,25*60)).toBe("approaching");expect(budgetStatus(intent,31*60)).toBe("exceeded");});
});
