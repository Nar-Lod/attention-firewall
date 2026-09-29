import "fake-indexeddb/auto";
import {describe,expect,it} from "vitest";
import {EncryptedIndexedDbStore} from "./index.js";

describe("encrypted indexed db store",()=>{
 it("round-trips JSON through AES-GCM encrypted storage",async()=>{
  const dbName="test-"+crypto.randomUUID();
  const store=new EncryptedIndexedDbStore("key-v1",dbName);
  const value={intent:"study",seconds:123,secret:"not plaintext"};
  await store.set(value);
  await expect(store.get()).resolves.toEqual(value);
  await store.clear();
  await expect(store.get()).resolves.toBeNull();
 });

 it("stores ciphertext instead of serialized plaintext",async()=>{
  const dbName="test-"+crypto.randomUUID();
  const store=new EncryptedIndexedDbStore("key-v1",dbName);
  await store.set({secret:"not plaintext"});
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const request=indexedDB.open(dbName,1);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  const raw=await new Promise<unknown>((resolve,reject)=>{
   const tx=db.transaction(["records"],"readonly");
   const request=tx.objectStore("records").get("profile");
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  db.close();
  expect(JSON.stringify(raw)).not.toContain("not plaintext");
 });
});
