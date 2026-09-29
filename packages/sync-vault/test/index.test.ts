import {describe,expect,it} from "vitest";
import {decryptVault,encryptVault,validateVaultEnvelope} from "../src/index.js";

describe("sync vault",()=>{
 it("encrypts and decrypts without exposing plaintext",async()=>{
  const value={rules:[{target:"social.example",minimumIntervention:"lock"}],commitments:2};
  const vault=await encryptVault(value,"a-strong-local-passphrase",600000);
  expect(vault.ciphertext).not.toContain("social.example");
  await expect(decryptVault<typeof value>(vault,"a-strong-local-passphrase")).resolves.toEqual(value);
 });
 it("rejects weak KDF work factors",async()=>{
  const vault=await encryptVault({}, "a-strong-local-passphrase", 600000);
  expect(()=>validateVaultEnvelope({...vault,iterations:1000})).toThrow();
 });
 it("rejects oversized ciphertext envelopes",()=>{
  expect(()=>validateVaultEnvelope({version:1,algorithm:"AES-GCM",kdf:"PBKDF2-SHA-256",iterations:600000,salt:"x".repeat(16),iv:"x".repeat(12),ciphertext:"x".repeat(350001)})).toThrow();
 });
});
