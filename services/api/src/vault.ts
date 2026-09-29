import {validateVaultEnvelope,type VaultEnvelope} from "@attention-firewall/sync-vault";
import type {AuthenticatedContext,StoredVault} from "./types.js";
import {boundedJsonSize,requireHttps} from "./security.js";

const MAX_ENVELOPE_BYTES=350_000;

export interface VaultRepository{
 get(accountId:string):Promise<StoredVault|null>;
 put(accountId:string,envelope:VaultEnvelope,expectedVersion?:number):Promise<StoredVault>;
 delete(accountId:string):Promise<void>;
}

export class DisabledVaultRepository implements VaultRepository{
 async get():Promise<StoredVault|null>{return null}
 async put():Promise<StoredVault>{throw new Error("vault persistence not configured")}
 async delete():Promise<void>{return}
}

/**
 * The context resolver MUST come from trusted server-side authentication middleware.
 * Never populate AuthenticatedContext from client-supplied request headers.
 */
export type AuthenticatedContextResolver=
 (request:Request)=>Promise<AuthenticatedContext|null>|AuthenticatedContext|null;

export async function handleVault(
 request:Request,
 repository:VaultRepository,
 resolveContext?:AuthenticatedContextResolver
):Promise<Response>{
 try{
  requireHttps(request);
  const context=resolveContext?await resolveContext(request):null;
  if(!context)throw new Error("authentication required");
  if(!isSafeId(context.accountId)||!isSafeId(context.deviceId))throw new Error("invalid auth context");

  if(request.method==="GET"){
   return Response.json(await repository.get(context.accountId));
  }

  if(request.method==="PUT"){
   boundedJsonSize(request,MAX_ENVELOPE_BYTES);
   const payload=await request.json();
   if(!payload||typeof payload!=="object")throw new Error("invalid payload");
   const envelope=validateVaultEnvelope((payload as Record<string,unknown>).envelope);
   const expectedVersionValue=(payload as Record<string,unknown>).expectedVersion;
   const expectedVersion=expectedVersionValue===undefined?undefined:boundedVersion(expectedVersionValue);
   const saved=await repository.put(context.accountId,envelope,expectedVersion);
   return Response.json({version:saved.version,updatedAt:saved.updatedAt});
  }

  if(request.method==="DELETE"){
   await repository.delete(context.accountId);
   return Response.json({deleted:true});
  }

  return new Response("method not allowed",{status:405,headers:{"Allow":"GET,PUT,DELETE"}});
 }catch(error){
  const message=error instanceof Error?error.message:"request rejected";
  if(message==="authentication required"||message==="invalid auth context")return Response.json({error:"unauthorized"},{status:401});
  if(message==="https required")return Response.json({error:"https_required"},{status:400});
  if(message==="request too large")return Response.json({error:"payload_too_large"},{status:413});
  if(message==="version conflict")return Response.json({error:"version_conflict"},{status:409});
  if(message==="vault persistence not configured")return Response.json({error:"service_not_configured"},{status:503});
  return Response.json({error:"invalid_request"},{status:400});
 }
}

function isSafeId(value:unknown):value is string{
 return typeof value==="string"&&/^[a-zA-Z0-9_-]{8,128}$/.test(value);
}

function boundedVersion(value:unknown):number{
 if(!Number.isSafeInteger(value)||Number(value)<1||Number(value)>1_000_000)throw new Error("invalid version");
 return Number(value);
}
