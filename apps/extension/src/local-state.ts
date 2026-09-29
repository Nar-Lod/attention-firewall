import {EncryptedIndexedDbStore} from "@attention-firewall/secure-browser-store";
import {sweepLocalState} from "@attention-firewall/data-lifecycle";
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
}

const defaults:ExtensionState={
 version:2,
 protectionMode:"adaptive",
 interventionProfile:{successByIntervention:{},attemptsByIntervention:{}},
 rules:[],
 commitments:[],
 privacy:{telemetryOptIn:false,researchOptIn:false}
};

const store=new EncryptedIndexedDbStore<ExtensionState>("extension-state-v2","attention-firewall-extension-state");

export async function getLocalState():Promise<ExtensionState>{
 const existing=await store.get();
 if(existing?.version===2)return {...defaults,...existing};
 const legacy=await chrome.storage.local.get(["currentIntent","protectionMode","dailySummary","dailyHistory","interventionProfile","rules","commitments"]);
 let migrated:ExtensionState={
  ...defaults,
  currentIntent:legacy.currentIntent as IntentEnvelope|undefined,
  protectionMode:legacy.protectionMode==="strict"?"strict":"adaptive",
  dailySummary:legacy.dailySummary as DailySummary|undefined,
  dailyHistory:legacy.dailyHistory as DailyHistory|undefined,
  interventionProfile:(legacy.interventionProfile as InterventionProfile|undefined)??defaults.interventionProfile,
  rules:Array.isArray(legacy.rules)?legacy.rules as PolicyRule[]:[],
  commitments:Array.isArray(legacy.commitments)?legacy.commitments as Commitment[]:[]
 };
 const cleaned=sweepLocalState({dailyHistory:migrated.dailyHistory??{version:1,days:[]},commitments:migrated.commitments,interventionProfile:migrated.interventionProfile},Date.now(),30);\n migrated={...migrated,...cleaned};\n const hasLegacy=Object.values(legacy).some(value=>value!==undefined);
 if(hasLegacy){
  await store.set(migrated);
  await chrome.storage.local.remove(["currentIntent","protectionMode","dailySummary","dailyHistory","interventionProfile","rules","commitments"]);
 }
 return migrated;
}

export async function setLocalState(patch:Partial<ExtensionState>):Promise<ExtensionState>{
 const next={...(await getLocalState()),...patch};
 await store.set(next);
 return next;
}

export async function clearLocalState():Promise<void>{
 await store.clear();
 await chrome.storage.local.remove(["currentIntent","protectionMode","dailySummary","dailyHistory","interventionProfile","rules","commitments"]);
}
