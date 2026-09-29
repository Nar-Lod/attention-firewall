import {NextResponse} from "next/server";
import {clearSessionCookie,hashSessionToken,PostgresAuthStore} from "@attention-firewall/api";

export const runtime="nodejs";

function readToken(cookie:string|null){
 if(!cookie)return null;
 const part=cookie.split(";").map(v=>v.trim()).find(v=>v.startsWith("af_session="));
 return part?.slice("af_session=".length)??null;
}

export async function POST(request:Request){
 const databaseUrl=process.env.DATABASE_URL;
 if(!databaseUrl)return new NextResponse(null,{status:204,headers:{"Set-Cookie":clearSessionCookie()}});

 const raw=readToken(request.headers.get("cookie"));
 if(!raw)return new NextResponse(null,{status:204,headers:{"Set-Cookie":clearSessionCookie()}});

 const store=new PostgresAuthStore(databaseUrl);
 try{
  const token=decodeURIComponent(raw);
  const record=await store.getByTokenHash(hashSessionToken(token));
  if(record)await store.revoke(record.id);
  return new NextResponse(null,{status:204,headers:{"Set-Cookie":clearSessionCookie()}});
 }catch{return NextResponse.json({error:"logout_unavailable"},{status:503})}
 finally{await store.close()}
}
