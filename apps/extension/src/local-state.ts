import {EncryptedIndexedDbStore} from "@attention-firewall/secure-browser-store";
import {sweepLocalState} from "@attention-firewall/data-lifecycle";
import type {SecurityEvent} from "@attention-firewall/security-audit";
import {createSecurityEvent} from "@attention-firewall/security-audit";
import type {DailyHistory,DailySummary} from "@attention-firewall/local-analytics";
import type {InterventionProfile} from "@attention-firewall/attention-engine";
import type {PolicyRule} from "@attention-firewall/policy-engine";
import type {Commitment} from "@attention-firewall/commitment-engine";
import type {IntentEnvelope} from "@attention-firewall/intent-engine";

export interface ExtensionState{
 version:2;
 currentIntent?:IntentEnvelope;
 protectionMode:"adaptive"|"strict";
 dailySummary?:DailySummary;
 dailyHistory?:DailyHistory;
 interventionProfile:InterventionProfile;
 rules:PolicyRule[];
 commitments:Commitment[];
 privacy:{telemetryOptIn:boolean;researchOptIn:boolean};
 securityEvents:SecurityEvent[];
}

const defaults:ExtensionState={
 version:2,
 protectionMode:"adaptive",
 interventionProfile:{successByIntervention:{},attemptsByIntervention:{}},
 rules:[],
 commitments:[],
 privacy:{telemetryOptIn:false,researchOptIn:false},
 securityEvents:[]
};

const store=new EncryptedIndexedDbStore<ExtensionState>(
 "extension-state-v2",
 "attention-firewall-extension-state"
);

export async function getLocalState():Promise<ExtensionState>{
 const existing=await store.get();

 if(existing?.version===2){
  const merged:{[K in keyof ExtensionState]:ExtensionState[K]}={...defaults,...existing};
  const cleaned=sweepLocalState({
   dailyHistory:merged.dailyHistory??{version:1,days:[]},
   commitments:merged.commitments,
   interventionProfile:merged.interventionProfile,
   securityEvents:merged.securityEvents
  },Date.now(),30);
  const next:ExtensionState={...merged,...cleaned};
  if(JSON.stringify(next)!==JSON.stringify(merged))await store.set(next);
  return next;
 }

 const legacy=await chrome.storage.local.get([
  "currentIntent","protectionMode","dailySummary","dailyHistory",
  "interventionProfile","rules","commitments"
 ]);

 const migratedBase:ExtensionState={
  ...defaults,
  protectionMode:legacy.protectionMode==="strict"?"strict":"adaptive",
  interventionProfile:(legacy.interventionProfile as InterventionProfile|undefined)??defaults.interventionProfile,
  rules:Array.isArray(legacy.rules)?legacy.rules as PolicyRule[]:[],
  commitments:Array.isArray(legacy.commitments)?legacy.commitments as Commitment[]:[]
 };
 let migrated:ExtensionState={
  ...migratedBase,
  ...(legacy.currentIntent!==undefined?{currentIntent:legacy.currentIntent as IntentEnvelope}:{}),
  ...(legacy.dailySummary!==undefined?{dailySummary:legacy.dailySummary as DailySummary}:{}),
  ...(legacy.dailyHistory!==undefined?{dailyHistory:legacy.dailyHistory as DailyHistory}:{}),
 };

 const cleaned=sweepLocalState({
  dailyHistory:migrated.dailyHistory??{version:1,days:[]},
  commitments:migrated.commitments,
  interventionProfile:migrated.interventionProfile,
  securityEvents:migrated.securityEvents
 },Date.now(),30);

 migrated={...migrated,...cleaned};

 const hasLegacy=Object.values(legacy).some(value=>value!==undefined);
 if(hasLegacy){
  await store.set(migrated);
  await chrome.storage.local.remove([
   "currentIntent","protectionMode","dailySummary","dailyHistory",
   "interventionProfile","rules","commitments"
  ]);
 }

 return migrated;
}

export async function setLocalState(patch:Partial<ExtensionState>):Promise<ExtensionState>{
 const next={...(await getLocalState()),...patch};
 await store.set(next);
 return next;
}

export async function appendSecurityEvent(type:SecurityEvent["type"],outcome:SecurityEvent["outcome"]):Promise<ExtensionState>{
 const state=await getLocalState();
 const securityEvents=[createSecurityEvent(type,outcome),...state.securityEvents].slice(0,100);
 return setLocalState({securityEvents});
}

export async function clearLocalState():Promise<void>{
 await store.clear();
 await chrome.storage.local.remove([
  "currentIntent","protectionMode","dailySummary","dailyHistory",
  "interventionProfile","rules","commitments"
 ]);
}
