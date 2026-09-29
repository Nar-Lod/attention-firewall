import {describe,expect,it} from "vitest";
import {decryptVault,encryptVault} from "../src/index.js";
describe("sync vault",()=>{
 it("encrypts and decrypts without exposing plaintext",async()=>{
  const value={rules:[{target:"social.example",minimumIntervention:"lock"}],commitments:2};
  const vault=await encryptVault(value,"a-strong-local-passphrase",10000);
  expect(vault.ciphertext).not.toContain("social.example");
  await expect(decryptVault<typeof value>(vault,"a-strong-local-passphrase")).resolves.toEqual(value);
 });
 it("rejects a short passphrase",async()=>await expect(encryptVault({}, "short", 10000)).rejects.toThrow());
});
