import {buildSyncableSettings,encryptVault,validateVaultEnvelope,type SyncableSettings,type VaultEnvelope} from "@attention-firewall/sync-vault";

export interface SyncTransport{
 request(input:RequestInfo|URL,init?:RequestInit):Promise<Response>;
}

export interface SyncResult{
 version:number;
 updatedAt:number;
}

export async function encryptSettingsForSync(state:unknown,passphrase:string):Promise<VaultEnvelope>{
 const settings:SyncableSettings=buildSyncableSettings(state);
 return encryptVault(settings,passphrase);
}

export async function uploadEncryptedSettings(
 endpoint:string,
 envelope:VaultEnvelope,
 expectedVersion:number|undefined,
 transport:SyncTransport=globalThis
):Promise<SyncResult>{
 const response=await transport.request(endpoint,{
  method:"PUT",
  credentials:"include",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({envelope,expectedVersion})
 });
 if(!response.ok)throw new Error("sync upload failed");
 const result=await response.json() as Record<string,unknown>;
 if(!Number.isSafeInteger(result.version)||typeof result.updatedAt!=="number")throw new Error("invalid sync response");
 return {version:Number(result.version),updatedAt:Number(result.updatedAt)};
}

export async function downloadEncryptedSettings(
 endpoint:string,
 transport:SyncTransport=globalThis
):Promise<{envelope:VaultEnvelope|null;version?:number}>{
 const response=await transport.request(endpoint,{method:"GET",credentials:"include"});
 if(!response.ok)throw new Error("sync download failed");
 const result=await response.json() as Record<string,unknown>|null;
 if(result===null)return {envelope:null};
 const envelope=validateVaultEnvelope(result.envelope);
 if(result.version!==undefined&&!Number.isSafeInteger(result.version))throw new Error("invalid sync version");
 return {envelope,version:result.version as number|undefined};
}
