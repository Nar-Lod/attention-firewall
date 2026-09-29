import {describe,expect,it} from "vitest";
import {userIdBytes} from "../src/index.js";

describe("auth core",()=>{
 it("keeps WebAuthn user IDs separate from personal identifiers",()=>{
  const id=userIdBytes("AF_USER_9A3F5B7C");
  expect(id).toBeInstanceOf(Uint8Array);
  expect(new TextDecoder().decode(id)).toBe("AF_USER_9A3F5B7C");
 });
});
