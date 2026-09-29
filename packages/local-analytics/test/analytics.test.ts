import {describe,expect,it} from "vitest";import {emptyDay,addDailySeconds,recordIntervention,recordDriftEpisode} from "../src/index.js";
describe("local analytics",()=>{
 it("caps daily durations",()=>{const r=addDailySeconds(emptyDay(),"passiveSeconds",90000);expect(r.passiveSeconds).toBe(86400);});
 it("records only aggregates",()=>{let r=emptyDay();r=recordDriftEpisode(r);r=recordIntervention(r,true);expect(r.driftEpisodes).toBe(1);expect(r.interventionsShown).toBe(1);expect(r.interventionsAccepted).toBe(1);});
});
