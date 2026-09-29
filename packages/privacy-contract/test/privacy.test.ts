import {describe,expect,it} from "vitest";import {validateTelemetry} from "../src/index.js";

describe("privacy telemetry contract",()=>{
 it("accepts coarse diagnostics",()=>{
  const result=validateTelemetry({schemaVersion:1,kind:"intervention_shown",clientVersion:"0.1.0",engineVersion:"0.1.0",platform:"web",intervention:"pause"});
  expect(result).toEqual({schemaVersion:1,kind:"intervention_shown",clientVersion:"0.1.0",engineVersion:"0.1.0",platform:"web",intervention:"pause"});
 });
 it("rejects forbidden raw data",()=>{
  expect(()=>validateTelemetry({schemaVersion:1,kind:"crash",clientVersion:"0.1.0",engineVersion:"0.1.0",platform:"web",url:"https://example.com"})).toThrow();
 });
 it("strips nothing by accident because unknown fields are rejected",()=>{
  expect(()=>validateTelemetry({schemaVersion:1,kind:"crash",clientVersion:"0.1.0",engineVersion:"0.1.0",platform:"web",randomExtra:"x"})).toThrow();
 });
 it("rejects oversized arbitrary strings",()=>{
  expect(()=>validateTelemetry({schemaVersion:1,kind:"crash",clientVersion:"0.1.0",engineVersion:"0.1.0",platform:"web",intervention:"x".repeat(200)})).toThrow();
 });
});