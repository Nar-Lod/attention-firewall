import {createHmac,timingSafeEqual} from "node:crypto";

export interface FlowCookiePayload{
 txId:string;
 accountId?:string;
 webauthnUserID?:string;
}

function b64url(value:Buffer|string):string{
 return Buffer.from(value).toString("base64url");
}

function unb64url(value:string):string{
 return Buffer.from(value,"base64url").toString("utf8");
}

function sign(value:string,secret:string):string{
 return createHmac("sha256",secret).update(value,"utf8").digest("base64url");
}

export function createFlowCookie(
 name:"af_reg"|"af_auth",
 payload:FlowCookiePayload,
 secret:string,
 maxAgeSeconds=300
):string{
 if(secret.length<32)throw new Error("flow secret too short");
 const encoded=b64url(JSON.stringify(payload));
 const signature=sign(encoded,secret);
 return name+"="+encoded+"."+signature+"; Path=/; Max-Age="+maxAgeSeconds+"; HttpOnly; Secure; SameSite=Strict";
}

export function clearFlowCookie(name:"af_reg"|"af_auth"):string{
 return name+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict";
}

export function readFlowCookie(
 request:Request,
 name:"af_reg"|"af_auth",
 secret:string
):FlowCookiePayload|null{
 const header=request.headers.get("cookie");
 if(!header||secret.length<32)return null;
 const raw=header.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1);
 if(!raw)return null;
 const dot=raw.lastIndexOf(".");
 if(dot<1)return null;
 const encoded=raw.slice(0,dot);
 const provided=raw.slice(dot+1);
 const expected=sign(encoded,secret);
 const a=Buffer.from(provided,"base64url");
 const b=Buffer.from(expected,"base64url");
 if(a.length!==b.length||!timingSafeEqual(a,b))return null;
 try{
  const value=JSON.parse(unb64url(encoded)) as Record<string,unknown>;
  if(typeof value.txId!=="string"||value.txId.length>80)return null;
  if(value.accountId!==undefined&&typeof value.accountId!=="string")return null;
  if(value.webauthnUserID!==undefined&&typeof value.webauthnUserID!=="string")return null;
  return value as FlowCookiePayload;
 }catch{return null}
}
