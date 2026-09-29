import {describe,expect,it} from "vitest";
import {addDailySeconds,emptyDay} from "../src/index.js";
import {DEFAULT_HISTORY,currentDay,pruneHistory,upsertDay} from "../src/history.js";

describe("local daily history",()=>{
 it("keeps newest day first",()=>{
  let h=DEFAULT_HISTORY;
  const old=addDailySeconds(emptyDay("2026-09-28"),"passiveSeconds",60);
  const now=addDailySeconds(emptyDay("2026-09-29"),"passiveSeconds",120);
  h=upsertDay(h,old);h=upsertDay(h,now);
  expect(h.days[0]?.date).toBe("2026-09-29");
 });
 it("retains only the configured window",()=>{
  let h=DEFAULT_HISTORY;
  for(let i=0;i<5;i++){
   const d=new Date("2026-09-25T00:00:00Z");d.setUTCDate(d.getUTCDate()-i);
   h=upsertDay(h,emptyDay(d.toISOString().slice(0,10)));
  }
  h=pruneHistory(h,3,"2026-09-25");
  expect(h.days).toHaveLength(3);
 });
 it("returns an empty current day when no record exists",()=>{
  expect(currentDay(DEFAULT_HISTORY).passiveSeconds).toBe(0);
 });
});
