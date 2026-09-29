import {describe,expect,it} from "vitest";
import {
 validateRuntimeInterventionResponse,
 validateRuntimeRecoveryCompleted,
 validateRuntimeSample,
 validateRuntimeSessionStart
} from "./index.js";

describe("runtime protocol",()=>{
 it("accepts bounded session and sample events",()=>{
  expect(validateRuntimeSessionStart({
   protocolVersion:1,eventKind:"session-start",platform:"web",domain:"example.com"
  }).domain).toBe("example.com");
  expect(validateRuntimeSample({
   protocolVersion:1,eventKind:"sample",platform:"web",domain:"example.com",
   elapsedSeconds:15,interactions:2,scrolls:10
  }).eventKind).toBe("sample");
 });
 it("rejects unbounded or malformed events",()=>{
  expect(()=>validateRuntimeSample({
   protocolVersion:1,eventKind:"sample",platform:"web",
   elapsedSeconds:301,interactions:0,scrolls:0
  })).toThrow();
  expect(()=>validateRuntimeSessionStart({
   protocolVersion:1,eventKind:"session-start",platform:"web",domain:""
  })).toThrow();
  expect(()=>validateRuntimeInterventionResponse({
   protocolVersion:1,eventKind:"intervention-response",platform:"web",
   intervention:"unknown",outcome:"continued"
  })).toThrow();
  expect(()=>validateRuntimeRecoveryCompleted({
   protocolVersion:1,eventKind:"recovery-completed",platform:"web",
   durationSeconds:119
  })).toThrow();
 });
 it("bounds recovery and validates response outcomes",()=>{
  expect(validateRuntimeRecoveryCompleted({
   protocolVersion:1,eventKind:"recovery-completed",platform:"android",
   durationSeconds:120
  }).durationSeconds).toBe(120);
  expect(validateRuntimeInterventionResponse({
   protocolVersion:1,eventKind:"intervention-response",platform:"android",
   intervention:"pause",outcome:"exited"
  }).outcome).toBe("exited");
 });
});
