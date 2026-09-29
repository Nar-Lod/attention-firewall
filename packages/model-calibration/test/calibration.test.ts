import {describe,expect,it} from "vitest";
import {evaluateModel} from "../src/index.js";

const base={sessionSeconds:180,repeatedOpens:0,recentReopens:0,passiveSeconds:30,interactionRate:.5,scrollEventsPerMinute:4,scrollBursts:0,scrollDirectionChanges:0,scrollDistancePerMinute:200,contextSwitches:0,declaredIntentMatch:1,outsideIntent:false,lateNightRisk:0,notificationLaunch:false,previousInterventionIgnored:false};

describe("model calibration",()=>{
 it("produces a reproducible confusion matrix",()=>{
  const report=evaluateModel([{features:base,label:"intentional"}]);
  expect(report.observations).toBe(1);
  expect(report.accuracy).toBe(1);
  expect(report.modelVersion).toBe("attention-v1");
 });
});
