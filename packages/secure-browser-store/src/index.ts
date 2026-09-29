export interface SecureStore<T>{get():Promise<T|null>;set(value:T):Promise<void>;clear():Promise<void>}

type StoredRecord={key:string;iv:ArrayBuffer;ciphertext:ArrayBuffer};
type KeyRecord={id:string;key:CryptoKey};

export class EncryptedIndexedDbStore<T> implements SecureStore<T>{
 private dbPromise:Promise<IDBDatabase>|undefined;

 constructor(private readonly keyId="attention-firewall-v1",private readonly dbName="attention-firewall-secure"){}

 async get():Promise<T|null>{
  const record=await this.readRecord();
  if(!record)return null;
  const key=await this.getKey();
  const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(record.iv)},key,record.ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
 }

 async set(value:T):Promise<void>{
  const key=await this.getKey();
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=new TextEncoder().encode(JSON.stringify(value));
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plaintext);
  const db=await this.open();
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(["records"],"readwrite");
   tx.objectStore("records").put({key:"profile",iv:iv.buffer,ciphertext} satisfies StoredRecord);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error??new Error("write failed"));
  });
 }

 async clear():Promise<void>{
  const db=await this.open();
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(["records"],"readwrite");
   tx.objectStore("records").delete("profile");
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error??new Error("delete failed"));
  });
 }

 private async readRecord():Promise<StoredRecord|null>{
  const db=await this.open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(["records"],"readonly");
   const req=tx.objectStore("records").get("profile");
   req.onsuccess=()=>resolve((req.result as StoredRecord|undefined)??null);
   req.onerror=()=>reject(req.error??new Error("read failed"));
  });
 }

 private async getKey():Promise<CryptoKey>{
  const db=await this.open();
  const existing=await new Promise<KeyRecord|undefined>((resolve,reject)=>{
   const tx=db.transaction(["keys"],"readonly");
   const req=tx.objectStore("keys").get(this.keyId);
   req.onsuccess=()=>resolve(req.result as KeyRecord|undefined);
   req.onerror=()=>reject(req.error??new Error("key lookup failed"));
  });

  if(existing?.key)return existing.key;

  const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);

  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(["keys"],"readwrite");
   tx.objectStore("keys").put({id:this.keyId,key} satisfies KeyRecord);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error??new Error("key write failed"));
  });

  return key;
 }

 private open():Promise<IDBDatabase>{
  if(this.dbPromise)return this.dbPromise;

  this.dbPromise=new Promise((resolve,reject)=>{
   const req=indexedDB.open(this.dbName,1);

   req.onupgradeneeded=()=>{
    const db=req.result;
    if(!db.objectStoreNames.contains("records"))db.createObjectStore("records",{keyPath:"key"});
    if(!db.objectStoreNames.contains("keys"))db.createObjectStore("keys",{keyPath:"id"});
   };

   req.onsuccess=()=>{
    const db=req.result;
    db.onversionchange=()=>db.close();
    resolve(db);
   };

   req.onerror=()=>{
    this.dbPromise=undefined;
    reject(req.error??new Error("indexeddb open failed"));
   };
  });

  return this.dbPromise;
 }
}
