"use client";

import {useEffect} from "react";

export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{void 0;},[]);
 return <main className="shell error-screen">
  <div className="loading-mark">AF</div>
  <p className="eyebrow">LOCAL RECOVERY</p>
  <h1>That page hit an unexpected problem.</h1>
  <p className="sub">Your local attention data was not sent with this error.</p>
  <div><button onClick={()=>reset()}>Try again</button><a href="/">Return to dashboard</a></div>
 </main>;
}
