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

 chrome.runtime.sendMessage({
  type:"SESSION_START",
  protocolVersion:RUNTIME_PROTOCOL_VERSION,
  domain:safeDomain()
 }).catch(()=>{});

 function reportActivity(){
  const now=Date.now();
  if(now-lastSentAt<15000)return;
  const elapsed=Math.max(1,(now-firstAt)/1000);
  chrome.runtime.sendMessage({
   type:"ACTIVITY_SAMPLE",
   protocolVersion:RUNTIME_PROTOCOL_VERSION,
   platform:"web",
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

function createButton(label:string,primary:boolean,disabled=false){
 const button=document.createElement("button");
 button.type="button";
 button.textContent=label;
 button.disabled=disabled;
 Object.assign(button.style,{
  border:"0",padding:"11px 15px",cursor:disabled?"not-allowed":"pointer",
  fontWeight:"700",background:primary?"#d0ad50":"#b83343",
  color:primary?"#17120a":"#fff",opacity:disabled?".55":"1"
 });
 return button;
}

function interventionCopy(intervention:Intervention){
 const copy:Record<Intervention,{title:string;body:string}>={
  none:{title:"",body:""},
  awareness:{title:"Notice the drift.",body:"You've been here for a sustained session. Decide whether you still want to continue."},
  deliberation:{title:"What are you choosing?",body:"Pause before continuing. The next action should be deliberate, not automatic."},
  pause:{title:"Take a pause.",body:"A short interruption can break the automatic scrolling loop. Continue when you're ready."},
  delay:{title:"Give the urge some space.",body:"Access is delayed briefly so the decision is intentional rather than automatic."},
  commitment:{title:"Honor your earlier decision.",body:"You set a stronger protection rule for this moment. Choose deliberately whether to continue."},
  lock:{title:"This session is paused.",body:"Your current protection policy does not allow an immediate return."}
 };
 return copy[intervention];
}

function showIntervention(intervention:Intervention,recoveryMinutes:number){
 if(intervention==="none")return;
 document.getElementById("attention-firewall-overlay")?.remove();

 const root=document.createElement("div");
 root.id="attention-firewall-overlay";
 Object.assign(root.style,{
  position:"fixed",inset:"0",zIndex:"2147483647",display:"grid",placeItems:"center",
  background:"rgba(0,0,0,.72)",fontFamily:"system-ui,sans-serif"
 });

 const card=document.createElement("div");
 Object.assign(card.style,{
  background:"#101010",color:"#fff",padding:"30px",width:"min(430px,calc(100vw - 36px))",
  border:"1px solid #74303a",boxShadow:"0 20px 80px #000"
 });

 const kicker=document.createElement("div");
 kicker.textContent="ATTENTION FIREWALL";
 Object.assign(kicker.style,{fontSize:"11px",letterSpacing:".15em",color:"#d8bb62",marginBottom:"12px"});

 const copy=interventionCopy(intervention);
 const title=document.createElement("h2");
 title.textContent=copy.title;
 Object.assign(title.style,{margin:"0 0 10px",fontSize:"27px",lineHeight:"1.1"});

 const body=document.createElement("p");
 body.textContent=copy.body;
 Object.assign(body.style,{color:"#999",lineHeight:"1.6",margin:"0"});

 const meta=document.createElement("p");
 meta.textContent="This decision is calculated locally on your device.";
 Object.assign(meta.style,{color:"#696969",fontSize:"11px",marginTop:"14px"});

 const actions=document.createElement("div");
 Object.assign(actions.style,{display:"flex",gap:"10px",marginTop:"22px",flexWrap:"wrap"});

 const exit=createButton("Exit & recover",true);
 const continueButton=createButton(intervention==="lock"?"Close":"Continue",false,intervention==="lock");

 exit.addEventListener("click",()=>{
  sendOutcome(intervention,"exited");
  showRecovery(recoveryMinutes);
 },{once:true});

 continueButton.addEventListener("click",()=>{
  sendOutcome(intervention,"continued");
  root.remove();
 },{once:true});

 actions.append(exit,continueButton);

 card.append(kicker,title,body,meta);

 if(intervention==="deliberation"||intervention==="pause"||intervention==="delay"){
  const seconds=intervention==="deliberation"?5:intervention==="pause"?10:60;
  const countdown=document.createElement("div");
  countdown.textContent="Continue in "+seconds+"s";
  Object.assign(countdown.style,{color:"#d8bb62",fontSize:"13px",marginTop:"18px"});
  card.append(countdown);
  continueButton.disabled=true;

  let remaining=seconds;
  const timer=window.setInterval(()=>{
   remaining-=1;
   countdown.textContent=remaining>0?"Continue in "+remaining+"s":"You can continue deliberately.";
   continueButton.disabled=remaining>0;
   continueButton.style.opacity=remaining>0?".55":"1";
   continueButton.style.cursor=remaining>0?"not-allowed":"pointer";
   if(remaining<=0)window.clearInterval(timer);
  },1000);

  root.addEventListener("remove",()=>window.clearInterval(timer),{once:true});
 }

 if(intervention==="commitment"){
  const confirmLabel=document.createElement("label");
  Object.assign(confirmLabel.style,{display:"flex",gap:"8px",alignItems:"flex-start",marginTop:"18px",color:"#cfcfcf",fontSize:"12px",lineHeight:"1.5"});
  const checkbox=document.createElement("input");
  checkbox.type="checkbox";
  checkbox.setAttribute("aria-label","Confirm intentional continuation");
  confirmLabel.append(checkbox,document.createTextNode("I am choosing to continue intentionally."));
  continueButton.disabled=true;
  checkbox.addEventListener("change",()=>{
   continueButton.disabled=!checkbox.checked;
   continueButton.style.opacity=checkbox.checked?"1":".55";
   continueButton.style.cursor=checkbox.checked?"pointer":"not-allowed";
  });
  card.append(confirmLabel);
 }

 card.append(actions);
 root.append(card);
 document.documentElement.appendChild(root);
}

function showRecovery(minutes:number){
 const root=document.getElementById("attention-firewall-overlay");
 if(!root)return;
 root.textContent="";

 const card=document.createElement("div");
 Object.assign(card.style,{background:"#101010",color:"#fff",padding:"30px",width:"min(430px,calc(100vw - 36px))",border:"1px solid #5c4823",boxShadow:"0 20px 80px #000"});

 const kicker=document.createElement("div");
 kicker.textContent="RECOVERY";
 Object.assign(kicker.style,{fontSize:"11px",letterSpacing:".15em",color:"#d8bb62",marginBottom:"12px"});

 const title=document.createElement("h2");
 title.textContent="Reclaim the next few minutes.";
 Object.assign(title.style,{margin:"0 0 8px",fontSize:"27px"});

 const body=document.createElement("p");
 body.textContent="Choose a short recovery action. The timer stays on this device.";
 Object.assign(body.style,{color:"#999",lineHeight:"1.6"});

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
 Object.assign(card.style,{background:"#101010",color:"#fff",padding:"30px",width:"min(430px,calc(100vw - 36px))",border:"1px solid #5c4823",boxShadow:"0 20px 80px #000",textAlign:"center"});

 const title=document.createElement("h2");
 title.textContent="Recovery in progress";

 const timer=document.createElement("div");
 timer.textContent=formatTime(minutes*60);
 Object.assign(timer.style,{fontSize:"58px",fontWeight:"800",color:"#d7bb62",margin:"20px 0"});

 const hint=document.createElement("p");
 hint.textContent="Stay away from the distracting page. Completion is recorded only if the timer finishes here.";
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
