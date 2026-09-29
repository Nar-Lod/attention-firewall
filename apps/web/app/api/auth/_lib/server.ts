import {randomBytes,randomUUID} from "node:crypto";
import {PostgresAuthStore} from "@attention-firewall/api";

let store:PostgresAuthStore|undefined;

export function authConfig(){
 const rpName=process.env.AF_RP_NAME??"Attention Firewall";
 const rpID=process.env.AF_RP_ID;
 const origin=process.env.AF_AUTH_ORIGIN;
 const secret=process.env.AF_SESSION_SECRET;
 const databaseUrl=process.env.DATABASE_URL;
 if(!rpID||!origin||!secret||secret.length<32||!databaseUrl)throw new Error("auth not configured");
 return {rpName,rpID,origin,secret,databaseUrl};
}

export function getAuthStore():PostgresAuthStore{
 const {databaseUrl}=authConfig();
 if(!store)store=new PostgresAuthStore(databaseUrl);
 return store;
}

export function newAnonymousAccount(){
 return {
  accountId:randomUUID(),
  webauthnUserID:"AF_"+randomBytes(18).toString("base64url"),
  username:"attention-user"
 };
}

export function newDeviceId(){return randomUUID()}

export function appVersion(){return (process.env.AF_WEB_APP_VERSION??"0.1.0").slice(0,32)}

export function noStoreHeaders(extra?:Record<string,string>):Record<string,string>{
 return {"Cache-Control":"no-store, private","Pragma":"no-cache",...extra};
}
