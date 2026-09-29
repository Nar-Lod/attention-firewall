import {describe,expect,it} from "vitest";
import {assertNoBehavioralFields,createSecurityEvent,redactSecurityEvent} from "../src/index.js";

describe("security audit",()=>{
 it("creates an allowlisted event without behavioral metadata",()=>{
  const e=createSecurityEvent("permission_changed","success",1000);
  expect(e).toEqual({version:1,id:expect.any(String),type:"permission_changed",occurredAt:1000,outcome:"success"});
 });
 it("rejects behavioral fields",()=>{
  expect(()=>assertNoBehavioralFields({type:"security_error",url:"https://example.com"})).toThrow();
 });
 it("redacts unknown metadata",()=>{
  expect(()=>redactSecurityEvent({version:1,id:"x",type:"security_error",occurredAt:1000,outcome:"success",deviceId:"x"})).not.toThrow();
 });
});
