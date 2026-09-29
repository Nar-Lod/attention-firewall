import {describe,expect,it} from "vitest";
import {clearSessionCookie,hashSessionToken,issueSession,sessionCookie} from "./session.js";

describe("secure web sessions",()=>{
 it("issues an opaque high-entropy token and stores only its hash",()=>{
  const {token,record}=issueSession("account_12345678","device_12345678",1000);
  expect(token.length).toBeGreaterThan(30);
  expect(record.tokenHash).toBe(hashSessionToken(token));
  expect(record.tokenHash).not.toBe(token);
 });
 it("uses secure httpOnly sameSite cookie attributes",()=>{
  const cookie=sessionCookie("opaque");
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=Strict");
 });
 it("clears sessions with an expiring cookie",()=>expect(clearSessionCookie()).toContain("Max-Age=0"));
});
