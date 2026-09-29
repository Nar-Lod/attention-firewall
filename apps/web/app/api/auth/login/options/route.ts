import {NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {createAuthenticationOptions,createFlowCookie,PostgresAuthStore} from "@attention-firewall/api";

export const runtime="nodejs";

export async function POST(){
 const databaseUrl=process.env.DATABASE_URL;
 const flowSecret=process.env.AUTH_FLOW_SECRET;
 const rpID=process.env.WEBAUTHN_RP_ID;
 const origin=process.env.WEBAUTHN_ORIGIN;
 if(!databaseUrl||!flowSecret||!rpID||!origin)return NextResponse.json({error:"service_not_configured"},{status:503});

 const store=new PostgresAuthStore(databaseUrl);
 try{
  const result=await createAuthenticationOptions([],rpID);
  const txId=randomUUID();
  await store.put("auth:"+txId,result.challenge,Date.now()+5*60_000);
  const response=NextResponse.json({options:result.options});
  response.headers.append("Set-Cookie",createFlowCookie("af_auth",{txId},flowSecret));
  return response;
 }catch{return NextResponse.json({error:"authentication_unavailable"},{status:503})}
 finally{await store.close()}
}
