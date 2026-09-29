import {describe,expect,it} from "vitest";
import {RUNTIME_PROTOCOL_VERSION,validateRuntimeSample} from "../src/index.js";

describe("runtime protocol",()=>{
 it("validates bounded platform samples",()=>{
  const r=validateRuntimeSample({protocolVersion:RUNTIME_PROTOCOL_VERSION,platform:"web",domain:"example.com",elapsedSeconds:15,interactions:2,scrolls:10});
  expect(r.platform).toBe("web");
 });
 it("rejects unbounded samples",()=>{
  expect(()=>validateRuntimeSample({protocolVersion:1,platform:"web",elapsedSeconds:999,interactions:1,scrolls:1})).toThrow();
 });
});
