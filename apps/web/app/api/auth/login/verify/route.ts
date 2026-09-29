import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {clearFlowCookie,PostgresAuthStore,readFlowCookie,sessionCookie,issueSession} from "@attention-firewall/api";
import {verifyAuthentication} from "@attention-firewall/auth-core";
import type {AuthenticationResponseJSON} from "@simplewebauthn/server";

export const runtime="nodejs";

export async function POST(request:Request){
 const databaseUrl=process.env.DATABASE_URL;
 const flowSecret=process.env.AUTH_FLOW_SECRET;
 const rpID=process.env.WEBAUTHN_RP_ID;
 const origin=process.env.WEBAUTHN_ORIGIN;
 if(!databaseUrl||!flowSecret||!rpID||!origin)return NextResponse.json({error:"service_not_configured"},{status:503});

 const flow=readFlowCookie(request,"af_auth",flowSecret);
 if(!flow?.txId)return NextResponse.json({error:"authentication_expired"},{status:400});

 let response:AuthenticationResponseJSON;
 try{response=await request.json() as AuthenticationResponseJSON}catch{return NextResponse.json({error:"invalid_authentication_response"},{status:400})}

 const store=new PostgresAuthStore(databaseUrl);
 try{
  const challenge=await store.take("auth:"+flow.txId,Date.now());
  if(!challenge)return NextResponse.json({error:"authentication_expired"},{status:400});

  const match=await store.getByCredentialId(response.id);
  if(!match)return NextResponse.json({error:"authentication_failed"},{status:401});

  const verification=await verifyAuthentication(response,match.passkey,challenge,origin,rpID);
  if(!verification.verified)return NextResponse.json({error:"authentication_failed"},{status:401});

  await store.updateCounter(match.passkey.id,verification.authenticationInfo.newCounter);
  const deviceId=randomUUID();
  const sessionResult=issueSession(match.accountId,deviceId);
  await store.createDeviceAndSession({
   deviceId,
   accountId:match.accountId,
   platform:"web",
   appVersion:"0.1.0",
   session:sessionResult.record
  });

  const result=NextResponse.json({ok:true});
  result.headers.append("Set-Cookie",sessionCookie(sessionResult.token));
  result.headers.append("Set-Cookie",clearFlowCookie("af_auth"));
  return result;
 }catch{return NextResponse.json({error:"authentication_unavailable"},{status:503})}
 finally{await store.close()}
}
