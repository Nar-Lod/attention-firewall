import {NextResponse} from "next/server";
import {validateTelemetry} from "@attention-firewall/privacy-contract";

export async function POST(request:Request){
  if(request.headers.get("x-attention-telemetry-opt-in")!=="true"){
    return NextResponse.json({accepted:false,reason:"telemetry_not_opted_in"},{status:403});
  }
  try{
    const payload=validateTelemetry(await request.json());
    // Privacy boundary: validated telemetry is intentionally not persisted here.
    // A future diagnostics sink must remain coarse, purpose-bound and retention-limited.
    void payload;
    return NextResponse.json({accepted:true});
  }catch{
    return NextResponse.json({accepted:false,reason:"invalid_telemetry"},{status:400});
  }
}
