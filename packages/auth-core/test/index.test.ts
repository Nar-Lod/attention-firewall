import {describe,expect,it} from "vitest";
import {createAuthenticationOptions,createRegistrationOptions,userIdBytes} from "../src/index.js";

const user={id:"account_12345678",username:"attention-user",webauthnUserID:"AF_USER_9A3F5B7C"};

describe("auth core",()=>{
 it("keeps WebAuthn user IDs separate from personal identifiers",()=>{
  const id=userIdBytes(user.webauthnUserID);
  expect(id).toBeInstanceOf(Uint8Array);
  expect(new TextDecoder().decode(id)).toBe(user.webauthnUserID);
 });

 it("generates discoverable passkey registration options",async()=>{
  const result=await createRegistrationOptions(user,[],"Attention Firewall","localhost");
  expect(result.challenge.length).toBeGreaterThan(20);
  expect(result.options.user.name).toBe("attention-user");
  expect(result.options.authenticatorSelection?.residentKey).toBe("required");
  expect(result.options.authenticatorSelection?.userVerification).toBe("required");
 });

 it("generates discoverable authentication options when credentials are not enumerated",async()=>{
  const result=await createAuthenticationOptions([],"localhost");
  expect(result.challenge.length).toBeGreaterThan(20);
  expect(result.options.userVerification).toBe("required");
 });
});
