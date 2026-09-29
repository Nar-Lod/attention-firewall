import {describe,expect,it} from "vitest";
import {AttentionRuntime} from "@attention-firewall/attention-runtime";
import {fixtures} from "../src/fixtures.js";

function baseConfig(){
 return {
  protectionMode:"adaptive" as const,
  profile:{successByIntervention:{},attemptsByIntervention:{}},
  rules:[],
  commitments:[],
  intent:{id:"i1",label:"Study",purpose:"study" as const,targetDomains:["example.com"],startedAt:0,budgetMinutes:120}
 };
}

describe("runtime conformance fixtures",()=>{
 for(const fixture of fixtures){
  it(fixture.name,()=>{
   const config=baseConfig();
   if(fixture.name==="site commitment can enforce delay"){
    const now=1000;
    config.commitments=[{id:"c1",label:"Protect",targetDomains:["example.com"],startAt:now,endAt:now+600000,minimumIntervention:"delay",changeCooldownMinutes:5,createdAt:now}];
    const rt=new AttentionRuntime(config,{now:()=>now});
    rt.begin("example.com");
    expect(rt.sample(fixture.sample).intervention).toBe("delay");
    return;
   }
   if(fixture.name==="intent budget approaching triggers awareness")config.intent={...config.intent,budgetMinutes:2};
   if(fixture.name==="intent budget exceeded triggers pause")config.intent={...config.intent,budgetMinutes:1};
   const rt=new AttentionRuntime(config);
   rt.begin("example.com");
   expect(rt.sample(fixture.sample).intervention).toBe(fixture.expected.intervention);
  });
 }
});
