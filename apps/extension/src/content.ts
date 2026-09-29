type Intervention="none"|"awareness"|"deliberation"|"pause"|"delay"|"commitment"|"lock";

declare global { interface Window { __ATTENTION_FIREWALL_INITIALIZED__?:boolean } }
if(window.__ATTENTION_FIREWALL_INITIALIZED__) {
  // A duplicate dynamic registration must not create duplicate collectors.
} else {
  window.__ATTENTION_FIREWALL_INITIALIZED__=true;
  initialize();
}

function initialize(){
 let scrollCount=0;
 let interactionCount=0;
 let firstAt=Date.now();
 let lastSentAt=Date.now();

 function reportActivity(){
  const now=Date.now();
  if(now-lastSentAt<15000)return;
  const elapsed=Math.max(1,(now-firstAt)/1000);
  chrome.runtime.sendMessage({
   type:"ACTIVITY_SAMPLE",
   domain:safeDomain(),
   scrollCount:Math.min(scrollCount,500),
   interactionCount:Math.min(interactionCount,500),
   elapsedSeconds:Math.min(elapsed,300)
  }).catch(()=>{});
  scrollCount=0;interactionCount=0;lastSentAt=now;
 }

 window.addEventListener("scroll",()=>{scrollCount++;reportActivity()},{passive:true});
 window.addEventListener("pointerdown",()=>{interactionCount++;reportActivity()},{passive:true});
 window.addEventListener("keydown",()=>{interactionCount++;reportActivity()},{passive:true});

 chrome.runtime.onMessage.addListener((message:unknown)=>{
  if(!isInterventionMessage(message))return;
  showIntervention(message.intervention);
 });
}

function safeDomain(){
 try{return location.hostname.replace(/^www\./,"").slice(0,253)}
 catch{return "unknown"}
}

function isInterventionMessage(value:unknown):value is {type:"ATTENTION_INTERVENTION";intervention:Intervention}{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="ATTENTION_INTERVENTION"&&
  ["none","awareness","deliberation","pause","delay","commitment","lock"].includes(String(v.intervention));
}

function sendOutcome(intervention:Intervention,outcome:"continued"|"exited"){
 chrome.runtime.sendMessage({type:"INTERVENTION_RESPONSE",intervention,outcome}).catch(()=>{});
}

function showIntervention(intervention:Intervention){
 if(intervention==="none")return;
 document.getElementById("attention-firewall-overlay")?.remove();

 const root=document.createElement("div");
 root.id="attention-firewall-overlay";
 Object.assign(root.style,{
  position:"fixed",inset:"0",zIndex:"2147483647",display:"grid",placeItems:"center",
  background:"rgba(0,0,0,.68)",fontFamily:"system-ui,sans-serif"
 });

 const card=document.createElement("div");
 Object.assign(card.style,{
  background:"#101010",color:"#fff",padding:"28px",maxWidth:"420px",
  border:"1px solid #74303a",boxShadow:"0 20px 80px #000"
 });

 const kicker=document.createElement("div");
 kicker.textContent="ATTENTION FIREWALL";
 Object.assign(kicker.style,{fontSize:"11px",letterSpacing:".15em",color:"#d8bb5f",marginBottom:"12px"});

 const title=document.createElement("h2");
 title.textContent=intervention==="lock"?"This session is paused.":"Your session may be drifting.";
 Object.assign(title.style,{margin:"0 0 10px",fontSize:"26px"});

 const body=document.createElement("p");
 body.textContent=intervention==="awareness"
  ?"You have been here for a sustained session."
  :"Take a moment to decide whether continuing serves your current intention.";
 Object.assign(body.style,{color:"#999",lineHeight:"1.55"});

 const actions=document.createElement("div");
 Object.assign(actions.style,{display:"flex",gap:"10px",marginTop:"20px"});

 const exit=document.createElement("button");
 exit.type="button";exit.textContent="Exit";
 const continueButton=document.createElement("button");
 continueButton.type="button";continueButton.textContent=intervention==="lock"?"Close":"Continue";
 [exit,continueButton].forEach(button=>Object.assign(button.style,{border:"0",padding:"11px 15px",cursor:"pointer",fontWeight:"700"}));
 exit.style.background="#d0ad50";exit.style.color="#17120a";
 continueButton.style.background="#b83343";continueButton.style.color="#fff";

 exit.addEventListener("click",()=>{sendOutcome(intervention,"exited");root.remove()},{once:true});
 continueButton.addEventListener("click",()=>{sendOutcome(intervention,"continued");root.remove()},{once:true});

 actions.append(exit,continueButton);
 card.append(kicker,title,body,actions);
 root.append(card);
 document.documentElement.appendChild(root);
}
