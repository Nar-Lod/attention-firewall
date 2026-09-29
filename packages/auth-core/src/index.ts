import {
 generateAuthenticationOptions,
 generateRegistrationOptions,
 verifyAuthenticationResponse,
 verifyRegistrationResponse,
 type AuthenticatorTransportFuture,
 type PublicKeyCredentialCreationOptionsJSON,
 type PublicKeyCredentialRequestOptionsJSON,
 type RegistrationResponseJSON,
 type AuthenticationResponseJSON,
 type WebAuthnCredential
} from "@simplewebauthn/server";
import {isoUint8Array} from "@simplewebauthn/server/helpers";

export interface StoredPasskey {
 id:string;
 publicKey:Uint8Array;
 webauthnUserID:string;
 counter:number;
 transports?:string[];
 deviceType:"singleDevice"|"multiDevice";
 backedUp:boolean;
}

export interface AuthUser {
 id:string;
 username:string;
 webauthnUserID:string;
}

export interface RegistrationOptionsResult {
 options:PublicKeyCredentialCreationOptionsJSON;
 challenge:string;
}

export interface AuthenticationOptionsResult {
 options:PublicKeyCredentialRequestOptionsJSON;
 challenge:string;
}

export async function createRegistrationOptions(
 user:AuthUser,
 existingPasskeys:StoredPasskey[],
 rpName:string,
 rpID:string
):Promise<RegistrationOptionsResult>{
 const options=await generateRegistrationOptions({
  rpName,
  rpID,
  userName:user.username,
  userID:isoUint8Array.fromUTF8String(user.webauthnUserID),
  attestationType:"none",
  supportedAlgorithmIDs:[-7,-257],
  excludeCredentials:existingPasskeys.map(passkey=>({id:passkey.id,transports:passkey.transports})),
  authenticatorSelection:{
   residentKey:"required",
   userVerification:"preferred"
  }
 });
 return {options,challenge:options.challenge};
}

export async function verifyRegistration(
 response:RegistrationResponseJSON,
 expectedChallenge:string,
 expectedOrigin:string,
 expectedRPID:string
){
 return verifyRegistrationResponse({
  response,
  expectedChallenge,
  expectedOrigin,
  expectedRPID,
  requireUserVerification:true,
  supportedAlgorithmIDs:[-7,-257]
 });
}

export async function createAuthenticationOptions(
 passkeys:StoredPasskey[],
 rpID:string
):Promise<AuthenticationOptionsResult>{
 const options=await generateAuthenticationOptions({
  rpID,
  allowCredentials:passkeys.map(passkey=>({id:passkey.id,transports:passkey.transports})),
  userVerification:"required"
 });
 return {options,challenge:options.challenge};
}

export async function verifyAuthentication(
 response:AuthenticationResponseJSON,
 passkey:StoredPasskey,
 expectedChallenge:string,
 expectedOrigin:string,
 expectedRPID:string
){
 const credential:WebAuthnCredential={
  id:passkey.id,
  publicKey:new Uint8Array(passkey.publicKey),
  counter:passkey.counter,
  transports:passkey.transports
 };
 return verifyAuthenticationResponse({
  response,
  expectedChallenge,
  expectedOrigin,
  expectedRPID,
  requireUserVerification:true,
  credential
 });
}

export function userIdBytes(webauthnUserID:string):Uint8Array{
 return isoUint8Array.fromUTF8String(webauthnUserID);
}
