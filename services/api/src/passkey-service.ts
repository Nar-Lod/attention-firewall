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
 saveChallenge(key:string,challenge:string,expiresAt:number):Promise<void>;
 take(key:string,now:number):Promise<string|null>;
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
 async saveChallenge():Promise<void>{throw new Error("challenge persistence not configured")}
 async take():Promise<string|null>{throw new Error("challenge persistence not configured")}
}

export class DisabledPasskeyStore implements PasskeyStore{
 async list():Promise<StoredPasskey[]>{throw new Error("passkey persistence not configured")}
 async getById():Promise<StoredPasskey|null>{throw new Error("passkey persistence not configured")}
 async save():Promise<void>{throw new Error("passkey persistence not configured")}
 async updateCounter():Promise<void>{throw new Error("passkey persistence not configured")}
}

export async function beginRegistration(
 user:AuthUser,
 store:PasskeyStore,
 challenges:ChallengeStore,
 config:PasskeyConfig,
 now=Date.now()
){
 const passkeys=await store.list(user.id);
 const result=await createRegistrationOptions(user,passkeys,config.rpName,config.rpID);
 await challenges.saveChallenge("reg:"+user.id,result.challenge,now+config.challengeTtlMs);
 return result;
}

export async function completeRegistration(
 user:AuthUser,
 store:PasskeyStore,
 challenges:ChallengeStore,
 response:RegistrationResponseJSON,
 config:PasskeyConfig,
 now=Date.now(),
 persist=true
):Promise<StoredPasskey>{
 const challenge=await challenges.take("reg:"+user.id,now);
 if(!challenge)throw new Error("invalid or expired challenge");

 const verification=await verifyRegistration(response,challenge,config.origin,config.rpID);
 if(!verification.verified||!verification.registrationInfo){
  throw new Error("registration failed");
 }

 const info=verification.registrationInfo;
 const passkey:StoredPasskey={
  id:info.credential.id,
  publicKey:new Uint8Array(info.credential.publicKey),
  webauthnUserID:user.webauthnUserID,
  counter:info.credential.counter,
  ...(info.credential.transports?.length?{transports:info.credential.transports}:{}),
  deviceType:info.credentialDeviceType,
  backedUp:info.credentialBackedUp
 };

 if(persist)await store.save(user.id,passkey);
 return passkey;
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
 await challenges.saveChallenge("auth:"+user.id,result.challenge,now+config.challengeTtlMs);
 return result;
}

export async function completeAuthentication(
 userId:string,
 credentialId:string,
 response:AuthenticationResponseJSON,
 store:PasskeyStore,
 challenges:ChallengeStore,
 config:PasskeyConfig,
 now=Date.now()
){
 const challenge=await challenges.take("auth:"+userId,now);
 if(!challenge)throw new Error("invalid or expired challenge");

 const passkey=await store.getById(userId,credentialId);
 if(!passkey)throw new Error("credential not found");

 const verification=await verifyAuthentication(response,passkey,challenge,config.origin,config.rpID);
 if(!verification.verified)throw new Error("authentication failed");

 await store.updateCounter(passkey.id,verification.authenticationInfo.newCounter);
 return {
  verified:true as const,
  accountId:userId,
  passkeyId:passkey.id,
  newCounter:verification.authenticationInfo.newCounter
 };
}
