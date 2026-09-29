type Intervention="none"|"awareness"|"deliberation"|"pause"|"delay"|"commitment"|"lock";
const RUNTIME_PROTOCOL_VERSION=1;
declare global { interface Window { __ATTENTION_FIREWALL_INITIALIZED__?:boolean } }

if(!window.__ATTENTION_FIREWALL_INITIALIZED__){
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
   protocolVersion:RUNTIME_PROTOCOL_VERSION,
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
  showIntervention(message.intervention,Math.min(Math.max(message.recoveryMinutes??2,2),10));
 });
}

function safeDomain(){
 try{return location.hostname.replace(/^www\./,"").slice(0,253)}
 catch{return "unknown"}
}

function isInterventionMessage(value:unknown):value is {type:"ATTENTION_INTERVENTION";intervention:Intervention;recoveryMinutes?:number}{
 if(!value||typeof value!=="object")return false;
 const v=value as Record<string,unknown>;
 return v.type==="ATTENTION_INTERVENTION"&&
  ["none","awareness","deliberation","pause","delay","commitment","lock"].includes(String(v.intervention))&&
  (v.recoveryMinutes===undefined||(typeof v.recoveryMinutes==="number"&&Number.isFinite(v.recoveryMinutes)));
}

function sendOutcome(intervention:Intervention,outcome:"continued"|"exited"){
 chrome.runtime.sendMessage({type:"INTERVENTION_RESPONSE",intervention,outcome}).catch(()=>{});
}

function sendRecoveryCompleted(durationSeconds:number){
 chrome.runtime.sendMessage({type:"RECOVERY_COMPLETED",durationSeconds}).catch(()=>{});
}

function createButton(label:string,primary:boolean){
 const button=document.createElement("button");
 button.type="button";
 button.textContent=label;
 Object.assign(button.style,{
  border:"0",padding:"11px 15px",cursor:"pointer",fontWeight:"700",
  background:primary?"#d0ad50":"#b83343",color:primary?"#17120a":"#fff"
 });
 return button;
}

function showIntervention(intervention:Intervention,recoveryMinutes:number){
 if(intervention==="none")return;
 document.getElementById("attention-firewall-overlay")?.remove();

 const root=document.createElement("div");
 root.id="attention-firewall-overlay";
 Object.assign(root.style,{position:"fixed",inset:"0",zIndex:"2147483647",display:"grid",placeItems:"center",background:"rgba(0,0,0,.68)",fontFamily:"system-ui,sans-serif"});

 const card=document.createElement("div");
 Object.assign(card.style,{background:"#101010",color:"#fff",padding:"28px",maxWidth:"430px",border:"1px solid #74303a",boxShadow:"0 20px 80px #000"});

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
 Object.assign(actions.style,{display:"flex",gap:"10px",marginTop:"20px",flexWrap:"wrap"});
 const exit=createButton("Exit & recover",true);
 const continueButton=createButton(intervention==="lock"?"Close":"Continue",false);

 exit.addEventListener("click",()=>{
  sendOutcome(intervention,"exited");
  showRecovery(recoveryMinutes);
 },{once:true});

 continueButton.addEventListener("click",()=>{
  sendOutcome(intervention,"continued");
  root.remove();
 },{once:true});

 actions.append(exit,continueButton);
 card.append(kicker,title,body,actions);
 root.append(card);
 document.documentElement.appendChild(root);
}

function showRecovery(minutes:number){
 const root=document.getElementById("attention-firewall-overlay");
 if(!root)return;
 root.textContent="";

 const card=document.createElement("div");
 Object.assign(card.style,{background:"#101010",color:"#fff",padding:"28px",maxWidth:"430px",border:"1px solid #5c4823",boxShadow:"0 20px 80px #000"});

 const kicker=document.createElement("div");
 kicker.textContent="RECOVERY";
 Object.assign(kicker.style,{fontSize:"11px",letterSpacing:".15em",color:"#d8bb5f",marginBottom:"12px"});

 const title=document.createElement("h2");
 title.textContent="Reclaim the next few minutes.";
 Object.assign(title.style,{margin:"0 0 8px",fontSize:"26px"});

 const body=document.createElement("p");
 body.textContent="Choose a short recovery action. The timer and completion record stay on this device.";
 Object.assign(body.style,{color:"#999",lineHeight:"1.55"});

 const actionRow=document.createElement("div");
 Object.assign(actionRow.style,{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"18px"});
 const options=[Math.max(2,minutes),5,10].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).slice(0,3);

 for(const option of options){
  const button=createButton(option+" min reset",option===options[0]);
  button.addEventListener("click",()=>startRecovery(option));
  actionRow.append(button);
 }

 card.append(kicker,title,body,actionRow);
 root.append(card);
}

function startRecovery(minutes:number){
 const root=document.getElementById("attention-firewall-overlay");
 if(!root)return;
 root.textContent="";

 const card=document.createElement("div");
 Object.assign(card.style,{background:"#101010",color:"#fff",padding:"28px",maxWidth:"430px",border:"1px solid #5c4823",boxShadow:"0 20px 80px #000",textAlign:"center"});

 const title=document.createElement("h2");
 title.textContent="Recovery in progress";
 const timer=document.createElement("div");
 timer.textContent=formatTime(minutes*60);
 Object.assign(timer.style,{fontSize:"58px",fontWeight:"800",color:"#d7bb62",margin:"20px 0"});
 const hint=document.createElement("p");
 hint.textContent="Stay off the distracting page. You can close this tab; completion is recorded only if the timer finishes here.";
 Object.assign(hint.style,{color:"#999",lineHeight:"1.55"});

 const cancel=createButton("Cancel",false);
 card.append(title,timer,hint,cancel);
 root.append(card);

 let remaining=minutes*60;
 const interval=window.setInterval(()=>{
  remaining-=1;
  timer.textContent=formatTime(Math.max(remaining,0));
  if(remaining<=0){
   window.clearInterval(interval);
   sendRecoveryCompleted(minutes*60);
   title.textContent="Recovery complete";
   hint.textContent="You completed the recovery action. Return to your intention when ready.";
   cancel.textContent="Close";
  }
 },1000);

 cancel.addEventListener("click",()=>{
  window.clearInterval(interval);
  root.remove();
 },{once:true});
}

function formatTime(totalSeconds:number){
 const m=Math.floor(totalSeconds/60);
 const s=String(totalSeconds%60).padStart(2,"0");
 return m+":"+s;
}
