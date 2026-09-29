import {describe,expect,it} from "vitest";
import {constantTimeEqual,randomId,encryptJson,decryptJson} from "../src/index.js";

describe("security core",()=>{
 it("round-trips encrypted local data",async()=>{
  const blob=await encryptJson({secret:"local-only",count:7},"test-secret",10000);
  expect(await decryptJson(blob,"test-secret")).toEqual({secret:"local-only",count:7});
 });
 it("rejects wrong secrets",async()=>{
  const blob=await encryptJson({secret:"local-only"},"right",10000);
  await expect(decryptJson(blob,"wrong")).rejects.toBeTruthy();
 });
 it("generates non-identifying random device ids",()=>{
  const a=randomId("dev"),b=randomId("dev");
  expect(a).not.toBe(b); expect(a.startsWith("dev_")).toBe(true);
 });
 it("compares strings in fixed work for equal-length inputs",()=>{
  expect(constantTimeEqual("abc","abc")).toBe(true);
  expect(constantTimeEqual("abc","abd")).toBe(false);
  expect(constantTimeEqual("abc","abcd")).toBe(false);
 });
});
