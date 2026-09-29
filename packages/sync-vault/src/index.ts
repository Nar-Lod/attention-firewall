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
 if(!Number.isInteger(v.iterations)||Number(v.iterations)<600000||Number(v.iterations)>2_000_000)throw new Error("invalid KDF work factor");
 if(typeof v.salt!=="string"||v.salt.length<16||v.salt.length>128)throw new Error("invalid salt");
 if(typeof v.iv!=="string"||v.iv.length<12||v.iv.length>64)throw new Error("invalid iv");
 if(typeof v.ciphertext!=="string"||v.ciphertext.length<1||v.ciphertext.length>350_000)throw new Error("invalid ciphertext");
 return {
  version:1,
  algorithm:"AES-GCM",
  kdf:"PBKDF2-SHA-256",
  iterations:v.iterations,
  salt:v.salt,
  iv:v.iv,
  ciphertext:v.ciphertext
 };
}
