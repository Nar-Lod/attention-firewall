import {describe,expect,it} from "vitest";
import {AttentionRuntime} from "../src/index.js";

function makeConfig(overrides:Record<string,unknown>={}) {
  return {
    protectionMode:"adaptive" as const,
    profile:{successByIntervention:{},attemptsByIntervention:{}},
    rules:[],
    commitments:[],
    attentionTwin:undefined,
    intent:{id:"intent-1",label:"Study",purpose:"study" as const,targetDomains:["example.com"],startedAt:0},
    ...overrides
  };
}

describe("AttentionRuntime policy composition",()=>{
  it("applies a local site rule after attention evaluation",()=>{
    const rt=new AttentionRuntime(makeConfig({
      rules:[{id:"rule-1",target:"site",value:"example.com",enabled:true,minimumIntervention:"lock"}]
    }));
    rt.begin("example.com");
    const result=rt.sample({elapsedSeconds:30,interactions:1,scrolls:2,domain:"example.com"});
    expect(result.intervention).toBe("lock");
  });

  it("applies a local commitment over the baseline policy",()=>{
    const now=1_000_000;
    const rt=new AttentionRuntime(makeConfig({
      commitments:[{
        id:"c1",label:"Protect",targetDomains:["example.com"],
        startAt:now,endAt:now+10*60_000,minimumIntervention:"delay",
        changeCooldownMinutes:5,createdAt:now
      }]
    }),{now:()=>now});
    rt.begin("example.com");
    const result=rt.sample({elapsedSeconds:30,interactions:1,scrolls:2,domain:"example.com"});
    expect(["delay","commitment","lock"]).toContain(result.intervention);
  });

  it("learns that an exit is successful",()=>{
    const rt=new AttentionRuntime(makeConfig());
    rt.begin("example.com");
    const first=rt.sample({elapsedSeconds:600,interactions:0,scrolls:500,scrollBursts:12,domain:"example.com"});
    expect(first.intervention).not.toBe("none");
    rt.respond(first.intervention,"exited");
    const profile=rt.getInterventionProfile();
    expect(profile.attemptsByIntervention[first.intervention]).toBe(1);
    expect(profile.successByIntervention[first.intervention]).toBe(1);
  });
});
