chrome.runtime.onMessage.addListener((message)=>{
 if(message?.type!=="ATTENTION_INTERVENTION")return;
 const existing=document.getElementById("attention-firewall-overlay"); existing?.remove();
 const root=document.createElement("div"); root.id="attention-firewall-overlay";
 root.innerHTML='<div class="af-card"><div class="af-kicker">ATTENTION FIREWALL</div><h2>Your session may be drifting.</h2><p>This intervention is calculated locally. No page content is being uploaded.</p><div class="af-actions"><button id="af-exit">Exit</button><button id="af-continue">Continue</button></div></div>';
 Object.assign(root.style,{position:"fixed",inset:"0",zIndex:"2147483647",display:"grid",placeItems:"center",background:"rgba(0,0,0,.62)",fontFamily:"system-ui"});
 const card=root.firstElementChild as HTMLElement; Object.assign(card.style,{background:"#101010",color:"#fff",padding:"28px",maxWidth:"420px",border:"1px solid #74303a",boxShadow:"0 20px 80px #000"});
 document.documentElement.appendChild(root);
 document.getElementById("af-exit")?.addEventListener("click",()=>root.remove());
 document.getElementById("af-continue")?.addEventListener("click",()=>root.remove());
});
