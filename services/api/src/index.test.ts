import {describe,expect,it} from "vitest";
import {DisabledVaultRepository,handleVault} from "./vault.js";

describe("vault API security boundary",()=>{
 it("rejects unauthenticated access",async()=>{
  const response=await handleVault(new Request("https://example.com/api/sync/vault"),new DisabledVaultRepository());
  expect(response.status).toBe(401);
 });
 it("fails closed when persistence is unavailable",async()=>{
  const request=new Request("https://example.com/api/sync/vault",{
   method:"PUT",
   headers:{
    "content-type":"application/json",
    "x-authenticated-account":"account_12345678",
    "x-authenticated-device":"device_12345678"
   },
   body:JSON.stringify({envelope:{
    version:1,algorithm:"AES-GCM",kdf:"PBKDF2-SHA-256",iterations:600000,
    salt:"1234567890123456",iv:"123456789012",ciphertext:"ciphertext"
   }})
  });
  const response=await handleVault(request,new DisabledVaultRepository());
  expect(response.status).toBe(503);
 });
});
