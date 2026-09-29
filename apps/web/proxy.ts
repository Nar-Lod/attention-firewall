import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {randomUUID} from "node:crypto";

export function proxy(request:NextRequest){
  const nonce=Buffer.from(randomUUID()).toString("base64");
  const csp=[
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'nonce-"+nonce+"' 'strict-dynamic'",
    "connect-src 'self'",
    "upgrade-insecure-requests"
  ].join("; ");

  const requestHeaders=new Headers(request.headers);
  requestHeaders.set("x-nonce",nonce);
  requestHeaders.set("Content-Security-Policy",csp);

  const response=NextResponse.next({
    request:{headers:requestHeaders}
  });
  response.headers.set("Content-Security-Policy",csp);
  return response;
}

export const config={
  matcher:[
    {
      source:"/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing:[
        {type:"header",key:"next-router-prefetch"},
        {type:"header",key:"purpose",value:"prefetch"}
      ]
    }
  ]
};
