import {NextResponse} from "next/server";
import {handleVault,PostgresAuthStore,requireSession} from "@attention-firewall/api";

export const runtime="nodejs";

async function handler(request:Request){
 const connectionString=process.env.DATABASE_URL;
 if(!connectionString)return NextResponse.json({error:"service_not_configured"},{status:503});
 const store=new PostgresAuthStore(connectionString);
 try{
  const response=await handleVault(request,store,req=>requireSession(req,store));
  return new NextResponse(response.body,{status:response.status,headers:response.headers});
 }finally{
  await store.close();
 }
}

export async function GET(request:Request){return handler(request)}
export async function PUT(request:Request){return handler(request)}
export async function DELETE(request:Request){return handler(request)}
