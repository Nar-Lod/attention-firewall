import {NextResponse} from "next/server";

export const runtime="nodejs";

export async function GET(){
 return NextResponse.json({
  ok:true,
  service:"attention-firewall-web",
  version:"0.1.0",
  mode:"local-first",
  behavioralDataCloudStored:false,
  accountServiceConfigured:Boolean(process.env.DATABASE_URL)
 },{
  headers:{
   "Cache-Control":"no-store",
   "X-Content-Type-Options":"nosniff"
  }
 });
}
