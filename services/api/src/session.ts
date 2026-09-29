import {randomBytes,createHash} from "node:crypto";
import type {AuthenticatedContext} from "./types.js";

export interface SessionRecord{
 id:string;
 tokenHash:string;
 accountId:string;
 deviceId:string;
 createdAt:number;
 expiresAt:number;
 revokedAt?:number;
}

export interface SessionStore{
 create(record:SessionRecord):Promise<void>;
 getByTokenHash(tokenHash:string):Promise<SessionRecord|null>;
 revoke(sessionId:string):Promise<void>;
 revokeDevice(deviceId:string):Promise<void>;
}

export class DisabledSessionStore implements SessionStore{
 async create():Promise<void>{throw new Error("session persistence not configured")}
 async getByTokenHash():Promise<SessionRecord|null>{return null}
 async revoke():Promise<void>{return}
 async revokeDevice():Promise<void>{return}
}

export function issueSession(
 accountId:string,
 deviceId:string,
 now=Date.now(),
 lifetimeMs=8*60*60_000
):{token:string;record:SessionRecord}{
 if(!safeId(accountId)||!safeId(deviceId))throw new Error("invalid identity");
 const token=randomBytes(32).toString("base64url");
 const record:SessionRecord={
  id:randomBytes(16).toString("hex"),
  tokenHash:hashSessionToken(token),
  accountId,
  deviceId,
  createdAt:now,
  expiresAt:now+Math.min(Math.max(lifetimeMs,5*60_000),24*60*60_000)
 };
 return {token,record};
}

export function hashSessionToken(token:string):string{
 if(typeof token!=="string"||token.length<32||token.length>512)throw new Error("invalid session token");
 return createHash("sha256").update(token,"utf8").digest("hex");
}

export async function requireSession(
 request:Request,
 store:SessionStore,
 now=Date.now()
):Promise<AuthenticatedContext>{
 const token=parseSessionCookie(request.headers.get("cookie"));
 if(!token)throw new Error("authentication required");
 const record=await store.getByTokenHash(hashSessionToken(token));
 if(!record||record.revokedAt!==undefined||record.expiresAt<=now)throw new Error("authentication required");
 return {accountId:record.accountId,deviceId:record.deviceId};
}

export function sessionCookie(token:string,maxAgeSeconds=8*60*60):string{
 return "af_session="+encodeURIComponent(token)+"; Path=/; Max-Age="+String(maxAgeSeconds)+"; HttpOnly; Secure; SameSite=Strict";
}

export function clearSessionCookie():string{
 return "af_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict";
}

function parseSessionCookie(cookie:string|null):string|null{
 if(!cookie)return null;
 for(const part of cookie.split(";")){
  const [key,...rest]=part.trim().split("=");
  if(key==="af_session"){
   const value=rest.join("=");
   return value?decodeURIComponent(value):null;
  }
 }
 return null;
}

function safeId(value:string):boolean{return /^[a-zA-Z0-9_-]{8,128}$/.test(value)}
