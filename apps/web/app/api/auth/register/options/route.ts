import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {beginRegistration,PostgresAuthStore,createFlowCookie} from "@attention-firewall/api";

export const runtime="nodejs";

export async function POST(){
 const databaseUrl=process.env.DATABASE_URL;
 const flowSecret=process.env.AUTH_FLOW_SECRET;
 const rpID=process.env.WEBAUTHN_RP_ID;
 const origin=process.env.WEBAUTHN_ORIGIN;
 if(!databaseUrl||!flowSecret||!rpID||!origin)return NextResponse.json({error:"service_not_configured"},{status:503});

 const accountId=randomUUID();
 const user={id:accountId,username:"af_"+randomUUID().replaceAll("-","").slice(0,20),webauthnUserID:"af_user_"+randomUUID().replaceAll("-","")};
 const store=new PostgresAuthStore(databaseUrl);
 try{
  const result=await beginRegistration(user,store,store,{rpName:"Attention Firewall",rpID,origin,challengeTtlMs:5*60_000});
  const response=NextResponse.json({options:result.options});
  response.headers.append("Set-Cookie",createFlowCookie("af_reg",{txId:accountId,accountId,webauthnUserID:user.webauthnUserID},flowSecret));
  return response;
 }catch{return NextResponse.json({error:"registration_unavailable"},{status:503})}
 finally{await store.close()}
}
