import {NextResponse} from "next/server";
import {
 handleVault,
 PostgresAuthStore,
 requireSession,
 type AuthenticatedContext
} from "@attention-firewall/api";

export const runtime="nodejs";

function configMissing(){
 return !process.env.DATABASE_URL;
}

async function withStore<T>(work:(store:PostgresAuthStore)=>Promise<T>):Promise<T>{
 const store=new PostgresAuthStore(process.env.DATABASE_URL!);
 try{return await work(store)}finally{await store.close()}
}

function contextResolver(request:Request):Promise<AuthenticatedContext|null>{
 if(configMissing())return Promise.resolve(null);
 return withStore(store=>requireSession(request,store)).then(context=>context).catch(()=>null);
}

async function handler(request:Request){
 if(configMissing())return NextResponse.json({error:"service_not_configured"},{status:503});
 const response=await withStore(store=>handleVault(request,store,request=>contextResolver(request)));
 return new NextResponse(response.body,{status:response.status,headers:response.headers});
}

export async function GET(request:Request){return handler(request)}
export async function PUT(request:Request){return handler(request)}
export async function DELETE(request:Request){return handler(request)}
