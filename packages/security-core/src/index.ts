export interface EncryptedBlob {
  version:1;
  algorithm:"AES-GCM";
  kdf:"PBKDF2-SHA-256";
  iterations:number;
  salt:string;
  iv:string;
  ciphertext:string;
}

const encoder=new TextEncoder();
const decoder=new TextDecoder();

function bytesToBase64(bytes:Uint8Array):string{
  let binary="";
  for(const b of bytes) binary+=String.fromCharCode(b);
  return btoa(binary);
}
function base64ToBytes(value:string):Uint8Array{
  const binary=atob(value);
  const out=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) out[i]=binary.charCodeAt(i);
  return out;
}
async function deriveKey(secret:string,salt:Uint8Array,iterations:number):Promise<CryptoKey>{
  const material=await crypto.subtle.importKey("raw",encoder.encode(secret),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}

export async function encryptJson(value:unknown,secret:string,iterations=600000):Promise<EncryptedBlob>{
  if(!secret) throw new Error("encryption secret required");
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await deriveKey(secret,salt,iterations);
  const plaintext=encoder.encode(JSON.stringify(value));
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plaintext);
  return {version:1,algorithm:"AES-GCM",kdf:"PBKDF2-SHA-256",iterations,salt:bytesToBase64(salt),iv:bytesToBase64(iv),ciphertext:bytesToBase64(new Uint8Array(ciphertext))};
}

export async function decryptJson<T>(blob:EncryptedBlob,secret:string):Promise<T>{
  if(blob.version!==1||blob.algorithm!=="AES-GCM"||blob.kdf!=="PBKDF2-SHA-256") throw new Error("unsupported encrypted blob");
  const key=await deriveKey(secret,base64ToBytes(blob.salt),blob.iterations);
  const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(blob.iv)},key,base64ToBytes(blob.ciphertext));
  return JSON.parse(decoder.decode(plaintext)) as T;
}

export function randomId(prefix="dev"):string{
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  return prefix+"_"+Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}

export function constantTimeEqual(a:string,b:string):boolean{
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
