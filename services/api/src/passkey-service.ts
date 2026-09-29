import {
 createAuthenticationOptions,
 createRegistrationOptions,
 verifyAuthentication,
 verifyRegistration,
 type AuthUser,
 type StoredPasskey
} from "@attention-firewall/auth-core";
import type {AuthenticationResponseJSON,RegistrationResponseJSON} from "@simplewebauthn/server";

export interface ChallengeStore{
 put(key:string,challenge:string,expiresAt:number):Promise<void>;
 consume(key:string,challenge:string,now:number):Promise<boolean>;
}

export interface PasskeyStore{
 list(userId:string):Promise<StoredPasskey[]>;
 getById(userId:string,credentialId:string):Promise<StoredPasskey|null>;
 save(userId:string,passkey:StoredPasskey):Promise<void>;
 updateCounter(credentialId:string,counter:number):Promise<void>;
}

export interface PasskeyConfig{
 rpName:string;
 rpID:string;
 origin:string;
 challengeTtlMs:number;
}

export class DisabledChallengeStore implements ChallengeStore{
 async put():Promise<void>{throw new Error("challenge persistence not configured")}
 async consume():Promise<boolean>{return false}
}

export class DisabledPasskeyStore implements PasskeyStore{
 async list():Promise<StoredPasskey[]>{throw new Error("passkey persistence not configured")}
 async getById():Promise<StoredPasskey|null>{throw new Error("passkey persistence not configured")}
 async save():Promise<void>{throw new Error("passkey persistence not configured")}
 async updateCounter():Promise<void>{throw new Error("passkey persistence not configured")}
}

export async function beginRegistration(user:AuthUser,store:PasskeyStore,challenges:ChallengeStore,config:PasskeyConfig,now=Date.now()){
 const passkeys=await store.list(user.id);
 const result=await createRegistrationOptions(user,passkeys,config.rpName,config.rpID);
 const key="reg:"+user.id;
 await challenges.put(key,result.challenge,now+config.challengeTtlMs);
 return result;
}

export async function completeRegistration(
 user:AuthUser,
 store:PasskeyStore,
 challenges:ChallengeStore,
 response:RegistrationResponseJSON,
 config:PasskeyConfig,
 now=Date.now()
){
 const key="reg:"+user.id;
 const expected=await challenges.consume(key,"__peek__",now);
 if(expected)throw new Error("invalid challenge state");
 throw new Error("challenge retrieval must be implemented by a transactional challenge store");
}

export async function beginAuthentication(
 user:AuthUser,
 store:PasskeyStore,
 challenges:ChallengeStore,
 config:PasskeyConfig,
 now=Date.now()
){
 const passkeys=await store.list(user.id);
 const result=await createAuthenticationOptions(passkeys,config.rpID);
 await challenges.put("auth:"+user.id,result.challenge,now+config.challengeTtlMs);
 return result;
}

/**
 * Verification accepts the challenge loaded and atomically consumed by the caller's challenge store.
 * Keeping challenge retrieval outside this function makes one-time-use enforcement explicit.
 */
export async function completeAuthentication(
 passkey:StoredPasskey,
 response:AuthenticationResponseJSON,
 expectedChallenge:string,
 challenges:ChallengeStore,
 challengeKey:string,
 config:PasskeyConfig,
 now=Date.now(),
 updateCounter:(id:string,counter:number)=>Promise<void>=async()=>{}
){
 const valid=await challenges.consume(challengeKey,expectedChallenge,now);
 if(!valid)throw new Error("invalid or expired challenge");
 const verification=await verifyAuthentication(response,passkey,expectedChallenge,config.origin,config.rpID);
 if(!verification.verified)throw new Error("authentication failed");
 await updateCounter(passkey.id,verification.authenticationInfo.newCounter);
 return verification;
}
