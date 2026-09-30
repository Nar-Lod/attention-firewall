import {describe,expect,it} from "vitest";
import {validateRuntimeSample} from "../src/index.js";

describe("runtime protocol",()=>{
  it("accepts bounded web samples",()=>{
    const result=validateRuntimeSample({
      protocolVersion:1,eventKind:"sample",platform:"web",domain:"example.com",
      elapsedSeconds:15,interactions:2,scrolls:20,
      scrollBursts:3,scrollDirectionChanges:1,scrollDistancePerMinute:900
    });
    expect(result.domain).toBe("example.com");
  });

  it("rejects unbounded values",()=>{
    expect(()=>validateRuntimeSample({
      protocolVersion:1,platform:"web",domain:"example.com",
      elapsedSeconds:301,interactions:0,scrolls:0
    })).toThrow();
  });
});
