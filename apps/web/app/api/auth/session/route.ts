import {NextResponse} from "next/server";
import {PostgresAuthStore,requireSession} from "@attention-firewall/api";

export const runtime="nodejs";

export async function GET(request:Request){
 const databaseUrl=process.env.DATABASE_URL;
 if(!databaseUrl)return NextResponse.json({authenticated:false,serviceConfigured:false});
 const store=new PostgresAuthStore(databaseUrl);
 try{
  const context=await requireSession(request,store);
  return NextResponse.json({
   authenticated:true,
   accountId:context.accountId,
   deviceId:context.deviceId
  });
 }catch(error){
  const message=error instanceof Error?error.message:"";
  if(message==="authentication required"){
   return NextResponse.json({authenticated:false});
  }
  return NextResponse.json({error:"session_unavailable"},{status:503});
 }finally{
  await store.close();
 }
}
