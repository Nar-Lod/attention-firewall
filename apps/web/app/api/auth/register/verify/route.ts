import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {clearFlowCookie,completeRegistration,issueSession,PostgresAuthStore,readFlowCookie,sessionCookie} from "@attention-firewall/api";
import type {RegistrationResponseJSON} from "@simplewebauthn/server";

export const runtime="nodejs";

export async function POST(request:Request){
 const databaseUrl=process.env.DATABASE_URL;
 const flowSecret=process.env.AUTH_FLOW_SECRET;
 const rpID=process.env.WEBAUTHN_RP_ID;
 const origin=process.env.WEBAUTHN_ORIGIN;
 if(!databaseUrl||!flowSecret||!rpID||!origin)return NextResponse.json({error:"service_not_configured"},{status:503});

 const flow=readFlowCookie(request,"af_reg",flowSecret);
 if(!flow?.accountId||!flow.webauthnUserID)return NextResponse.json({error:"registration_expired"},{status:400});

 let response:RegistrationResponseJSON;
 try{response=await request.json() as RegistrationResponseJSON}catch{return NextResponse.json({error:"invalid_registration_response"},{status:400})}

 const store=new PostgresAuthStore(databaseUrl);
 try{
  const user={id:flow.accountId,username:"af_"+flow.accountId.replaceAll("-","").slice(0,20),webauthnUserID:flow.webauthnUserID};
  const passkey=await completeRegistration(user,store,store,response,{rpName:"Attention Firewall",rpID,origin,challengeTtlMs:5*60_000},Date.now(),false);
  const deviceId=randomUUID();
  const sessionResult=issueSession(flow.accountId,deviceId);
  await store.registerAccount({
   accountId:flow.accountId,
   authSubject:"passkey:"+flow.accountId,
   passkey,
   deviceId,
   platform:"web",
   appVersion:"0.1.0",
   session:sessionResult.record
  });
  const result=NextResponse.json({ok:true});
  result.headers.append("Set-Cookie",sessionCookie(sessionResult.token));
  result.headers.append("Set-Cookie",clearFlowCookie("af_reg"));
  return result;
 }catch(error){
  const message=error instanceof Error?error.message:"";
  if(message.includes("expired")||message.includes("challenge"))return NextResponse.json({error:"registration_expired"},{status:400});
  if(message.includes("registration failed"))return NextResponse.json({error:"registration_failed"},{status:400});
  return NextResponse.json({error:"registration_unavailable"},{status:503});
 }finally{await store.close()}
}
