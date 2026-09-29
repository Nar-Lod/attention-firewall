import {NextResponse} from "next/server";
import {validateTelemetry} from "@attention-firewall/privacy-contract";

export async function POST(request:Request){
  // Fail closed until the production account/device authentication layer exists.
  if(process.env.TELEMETRY_INGEST_ENABLED!=="true"){
    return NextResponse.json({accepted:false,reason:"telemetry_disabled"},{status:503});
  }
  if(request.headers.get("x-attention-telemetry-opt-in")!=="true"){
    return NextResponse.json({accepted:false,reason:"telemetry_not_opted_in"},{status:403});
  }
  const contentLength=Number(request.headers.get("content-length")??"0");
  if(Number.isFinite(contentLength)&&contentLength>4096){
    return NextResponse.json({accepted:false,reason:"payload_too_large"},{status:413});
  }
  try{
    const payload=validateTelemetry(await request.json());
    // Authentication, per-device authorization, rate limiting and retention-limited
    // diagnostics storage must be implemented before enabling this endpoint.
    void payload;
    return NextResponse.json({accepted:true});
  }catch{
    return NextResponse.json({accepted:false,reason:"invalid_telemetry"},{status:400});
  }
}
