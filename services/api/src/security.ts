import {createHash} from "node:crypto";
export function normalizeToken(token:string):string{return token.trim().slice(0,512)}
export function hashOpaqueToken(token:string):string{
 const normalized=normalizeToken(token);
 if(normalized.length<20)throw new Error("token too short");
 return createHash("sha256").update(normalized,"utf8").digest("hex");
}
export function requireHttps(request:Request):void{
 const forwarded=request.headers.get("x-forwarded-proto");
 const url=new URL(request.url);
 if(url.protocol!=="https:"&&forwarded!=="https:")throw new Error("https required");
}
export function boundedJsonSize(request:Request,maxBytes=350_000):void{
 const header=request.headers.get("content-length");
 if(header!==null){
  const bytes=Number(header);
  if(!Number.isFinite(bytes)||bytes<0||bytes>maxBytes)throw new Error("request too large");
 }
}
