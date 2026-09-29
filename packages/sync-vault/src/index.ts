export interface VaultEnvelope{
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

function toBase64(bytes:Uint8Array):string{
 let binary="";
 for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary);
}
function fromBase64(input:string):Uint8Array{
 const binary=atob(input);
 const bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes;
}

async function deriveKey(secret:string,salt:Uint8Array,iterations:number){
 if(secret.length<12)throw new Error("sync passphrase must contain at least 12 characters");
 const material=await crypto.subtle.importKey("raw",encoder.encode(secret),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey(
  {name:"PBKDF2",salt,iterations,hash:"SHA-256"},
  material,
  {name:"AES-GCM",length:256},
  false,
  ["encrypt","decrypt"]
 );
}

export async function encryptVault(value:unknown,passphrase:string,iterations=600000):Promise<VaultEnvelope>{
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await deriveKey(passphrase,salt,iterations);
 const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(JSON.stringify(value)));
 return {version:1,algorithm:"AES-GCM",kdf:"PBKDF2-SHA-256",iterations,salt:toBase64(salt),iv:toBase64(iv),ciphertext:toBase64(new Uint8Array(ciphertext))};
}

export async function decryptVault<T>(envelope:VaultEnvelope,passphrase:string):Promise<T>{
 if(envelope.version!==1||envelope.algorithm!=="AES-GCM"||envelope.kdf!=="PBKDF2-SHA-256")throw new Error("unsupported vault");
 const key=await deriveKey(passphrase,fromBase64(envelope.salt),envelope.iterations);
 const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(envelope.iv)},key,fromBase64(envelope.ciphertext));
 return JSON.parse(decoder.decode(plaintext)) as T;
}


export function validateVaultEnvelope(value:unknown):VaultEnvelope{
 if(!value||typeof value!=="object")throw new Error("invalid vault envelope");
 const v=value as Record<string,unknown>;
 if(v.version!==1||v.algorithm!=="AES-GCM"||v.kdf!=="PBKDF2-SHA-256")throw new Error("unsupported vault version");
 const iterationsValue=v.iterations;
 if(typeof iterationsValue!=="number"||!Number.isInteger(iterationsValue)||iterationsValue<600000||iterationsValue>2_000_000)throw new Error("invalid KDF work factor");
 if(typeof v.salt!=="string"||v.salt.length<16||v.salt.length>128)throw new Error("invalid salt");
 if(typeof v.iv!=="string"||v.iv.length<12||v.iv.length>64)throw new Error("invalid iv");
 if(typeof v.ciphertext!=="string"||v.ciphertext.length<1||v.ciphertext.length>350_000)throw new Error("invalid ciphertext");
 return {
  version:1,
  algorithm:"AES-GCM",
  kdf:"PBKDF2-SHA-256",
  iterations:iterationsValue,
  salt:v.salt,
  iv:v.iv,
  ciphertext:v.ciphertext
 };
}


export interface SyncableSettings{
 version:1;
 protectionMode:"adaptive"|"strict";
 currentIntent?:{
  id:string;
  label:string;
  purpose:string;
  targetDomains:string[];
  budgetMinutes?:number;
 };
 rules:Array<{
  id:string;
  target:string;
  value:string;
  enabled:boolean;
  minimumIntervention:string;
  startMinute?:number;
  endMinute?:number;
 }>;
 commitments:Array<{
  id:string;
  label:string;
  targetDomains:string[];
  startAt:number;
  endAt:number;
  minimumIntervention:string;
  changeCooldownMinutes:number;
  createdAt:number;
 }>;
}

export function buildSyncableSettings(state:unknown):SyncableSettings{
 if(!state||typeof state!=="object")throw new Error("invalid local settings");
 const value=state as Record<string,unknown>;

 const intent=value.currentIntent;
 const cleanIntent=intent&&typeof intent==="object"?sanitizeIntentForSync(intent):undefined;

 const rules=Array.isArray(value.rules)?value.rules.map(sanitizeRuleForSync):[];
 const commitments=Array.isArray(value.commitments)?value.commitments.map(sanitizeCommitmentForSync):[];

 return {
  version:1,
  protectionMode:value.protectionMode==="strict"?"strict":"adaptive",
  ...(cleanIntent?{currentIntent:cleanIntent}:{}),
  rules:rules.filter(Boolean) as SyncableSettings["rules"],
  commitments:commitments.filter(Boolean) as SyncableSettings["commitments"]
 };
}

function sanitizeIntentForSync(value:unknown){
 if(!value||typeof value!=="object")return undefined;
 const v=value as Record<string,unknown>;
 if(typeof v.id!=="string"||typeof v.label!=="string"||typeof v.purpose!=="string"||!Array.isArray(v.targetDomains))return undefined;
 const targetDomains=v.targetDomains.filter(x=>typeof x==="string").slice(0,30) as string[];
 if(targetDomains.length!==v.targetDomains.length)return undefined;
 const out:{
  id:string;label:string;purpose:string;targetDomains:string[];budgetMinutes?:number
 }={id:v.id.slice(0,80),label:v.label.slice(0,120),purpose:v.purpose.slice(0,32),targetDomains};
 if(typeof v.budgetMinutes==="number"&&Number.isInteger(v.budgetMinutes)&&v.budgetMinutes>=1&&v.budgetMinutes<=240)out.budgetMinutes=v.budgetMinutes;
 return out;
}

function sanitizeRuleForSync(value:unknown){
 if(!value||typeof value!=="object")return undefined;
 const v=value as Record<string,unknown>;
 if(typeof v.id!=="string"||typeof v.target!=="string"||typeof v.value!=="string"||typeof v.enabled!=="boolean"||typeof v.minimumIntervention!=="string")return undefined;
 const out:{id:string;target:string;value:string;enabled:boolean;minimumIntervention:string;startMinute?:number;endMinute?:number}={
  id:v.id.slice(0,80),target:v.target.slice(0,24),value:v.value.slice(0,253),enabled:v.enabled,minimumIntervention:v.minimumIntervention.slice(0,24)
 };
 if(typeof v.startMinute==="number"&&Number.isInteger(v.startMinute)&&v.startMinute>=0&&v.startMinute<1440)out.startMinute=v.startMinute;
 if(typeof v.endMinute==="number"&&Number.isInteger(v.endMinute)&&v.endMinute>=0&&v.endMinute<1440)out.endMinute=v.endMinute;
 return out;
}

function sanitizeCommitmentForSync(value:unknown){
 if(!value||typeof value!=="object")return undefined;
 const v=value as Record<string,unknown>;
 if(typeof v.id!=="string"||typeof v.label!=="string"||!Array.isArray(v.targetDomains)||typeof v.startAt!=="number"||typeof v.endAt!=="number"||typeof v.minimumIntervention!=="string"||typeof v.changeCooldownMinutes!=="number"||typeof v.createdAt!=="number")return undefined;
 if(v.targetDomains.some(x=>typeof x!=="string"))return undefined;
 return {
  id:v.id.slice(0,80),
  label:v.label.slice(0,120),
  targetDomains:(v.targetDomains as string[]).slice(0,30),
  startAt:v.startAt,
  endAt:v.endAt,
  minimumIntervention:v.minimumIntervention.slice(0,24),
  changeCooldownMinutes:Math.max(0,Math.min(1440,Math.floor(v.changeCooldownMinutes))),
  createdAt:v.createdAt
 };
}
