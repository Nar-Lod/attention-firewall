import {describe,expect,it} from "vitest";
import {DEFAULT_PROFILE} from "../src/schema.js";
import {parseLocalProfile} from "../src/validation.js";

describe("local profile validation",()=>{
 it("accepts the default profile",()=>expect(parseLocalProfile(DEFAULT_PROFILE).version).toBe(1));
 it("rejects unknown/malformed rule levels",()=>{
  expect(()=>parseLocalProfile({...DEFAULT_PROFILE,rules:[{id:"1",target:"example.com",enabled:true,level:"block"}]})).toThrow();
 });
 it("rejects oversized rules",()=>{
  expect(()=>parseLocalProfile({...DEFAULT_PROFILE,rules:Array.from({length:101},(_,i)=>({id:String(i),target:"example.com",enabled:true,level:"lock"}))})).toThrow();
 });
});
