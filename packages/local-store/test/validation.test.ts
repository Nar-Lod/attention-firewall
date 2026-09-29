import {describe,expect,it} from "vitest";
import {DEFAULT_PROFILE} from "../src/schema.js";
import {parseLocalProfile} from "../src/validation.js";

describe("local profile validation",()=>{
 it("accepts the default profile",()=>expect(parseLocalProfile(DEFAULT_PROFILE).version).toBe(1));
 it("rejects unknown intervention levels",()=>{
  expect(()=>parseLocalProfile({...DEFAULT_PROFILE,rules:[{id:"1",target:"site",value:"example.com",enabled:true,minimumIntervention:"block" as never}]})).toThrow();
 });
 it("rejects oversized rules",()=>{
  expect(()=>parseLocalProfile({...DEFAULT_PROFILE,rules:Array.from({length:101},(_,i)=>({id:String(i),target:"site",value:"example.com",enabled:true,minimumIntervention:"lock"}))})).toThrow();
 });
});
