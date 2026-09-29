import {describe,expect,it} from "vitest";
import {encryptSettingsForSync,uploadEncryptedSettings,downloadEncryptedSettings} from "../src/index.js";

function fakeTransport(response:unknown,status=200){
 return {request:async(_input:RequestInfo|URL,init?:RequestInit)=>{
   return new Response(JSON.stringify(response),{status,headers:{"content-type":"application/json"}})
   }};
}

describe("sync client",()=>{
 it("encrypts only syncable explicit settings",async()=>{
  const envelope=await encryptSettingsForSync({
   protectionMode:"strict",
   rules:[{id:"r",target:"site",value:"example.com",enabled:true,minimumIntervention:"pause"}],
   dailyHistory:[{date:"2026-09-29",driftEpisodes:100}],
   attentionTwin:{sampleDays:30}
  },"a-strong-passphrase");
  expect(envelope.ciphertext).not.toContain("example.com");
 });

 it("sends credentials as cookies and only the envelope",async()=>{
  let captured:RequestInit|undefined;
  const transport={request:async(_input:RequestInfo|URL,init?:RequestInit)=>{
    captured=init;
    return new Response(JSON.stringify({version:2,updatedAt:10}),{status:200});
  }};
  const envelope=await encryptSettingsForSync({protectionMode:"adaptive",rules:[],commitments:[]},"a-strong-passphrase");
  await uploadEncryptedSettings("/api/sync/vault",envelope,1,transport);
  expect(captured?.credentials).toBe("include");
  expect(String(captured?.body)).toContain("ciphertext");
  expect(String(captured?.body)).not.toContain("rules");
 });

 it("validates downloaded envelope",async()=>{
  const envelope=await encryptSettingsForSync({protectionMode:"adaptive",rules:[],commitments:[]},"a-strong-passphrase");
  const result=await downloadEncryptedSettings("/api/sync/vault",{request:async()=>new Response(JSON.stringify({envelope,version:1}),{status:200})});
  expect(result.version).toBe(1);
  expect(result.envelope?.algorithm).toBe("AES-GCM");
 });
});
