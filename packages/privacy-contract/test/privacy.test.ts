import {describe,expect,it} from "vitest";import {validateTelemetry} from "../src/index.js";
describe("privacy telemetry contract",()=>{
 it("accepts coarse diagnostics",()=>expect(validateTelemetry({schemaVersion:1,kind:"intervention_shown",clientVersion:"0.1.0",engineVersion:"0.1.0",platform:"web",intervention:"pause"}).kind).toBe("intervention_shown"));
 it("rejects URLs and content",()=>expect(()=>validateTelemetry({schemaVersion:1,kind:"crash",clientVersion:"0.1.0",engineVersion:"0.1.0",platform:"web",url:"https://example.com"})).toThrow());
});
