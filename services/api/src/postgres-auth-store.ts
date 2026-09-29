import {Pool,type PoolClient} from "pg";
import type {AuthenticatorTransportFuture} from "@simplewebauthn/server";
import type {StoredPasskey} from "@attention-firewall/auth-core";
import type {VaultRepository} from "./vault.js";
import type {ChallengeStore} from "./passkey-service.js";
import type {PasskeyStore} from "./passkey-service.js";
import type {SessionRecord,SessionStore} from "./session.js";
import type {StoredVault} from "./types.js";

export class PostgresAuthStore implements VaultRepository,ChallengeStore,PasskeyStore,SessionStore{
 private readonly pool:Pool;

 constructor(connectionString:string){
  if(!connectionString)throw new Error("DATABASE_URL required");
  this.pool=new Pool({
   connectionString,
   max:10,
   idleTimeoutMillis:30_000,
   connectionTimeoutMillis:5_000,
   ssl:connectionString.includes("localhost")?false:{rejectUnauthorized:true}
  });
 }

 async close(){await this.pool.end()}

 async get(accountId:string):Promise<StoredVault|null>{
  const result=await this.pool.query(
   "select account_id::text as account_id,envelope::text as envelope,version,extract(epoch from updated_at)*1000 as updated_at from sync_vaults where account_id=$1::uuid",
   [accountId]
  );
  const row=result.rows[0];
  if(!row)return null;
  return {accountId:row.account_id,ciphertextEnvelope:row.envelope,version:Number(row.version),updatedAt:Number(row.updated_at)};
 }

 async put(accountId:string,envelope:unknown,expectedVersion?:number):Promise<StoredVault>{
  const client=await this.pool.connect();
  try{
   await client.query("begin");
   const current=await client.query("select version from sync_vaults where account_id=$1::uuid for update",[accountId]);
   const currentVersion=current.rows[0]?Number(current.rows[0].version):0;
   if(expectedVersion!==undefined&&currentVersion!==expectedVersion){
    throw new Error("version conflict");
   }
   const nextVersion=currentVersion+1;
   const saved=await client.query(
    "insert into sync_vaults(account_id,envelope,version) values($1::uuid,$2::jsonb,$3) on conflict(account_id) do update set envelope=excluded.envelope,version=excluded.version,updated_at=now() returning account_id::text as account_id,envelope::text as envelope,version,extract(epoch from updated_at)*1000 as updated_at",
    [accountId,JSON.stringify(envelope),nextVersion]
   );
   await client.query("commit");
   const row=saved.rows[0];
   return {accountId:row.account_id,ciphertextEnvelope:row.envelope,version:Number(row.version),updatedAt:Number(row.updated_at)};
  }catch(error){
   await client.query("rollback").catch(()=>{});
   throw error;
  }finally{client.release();}
 }

 async delete(accountId:string){await this.pool.query("delete from sync_vaults where account_id=$1::uuid",[accountId])}

 async putChallenge(key:string,challenge:string,expiresAt:number,metadata?:Record<string,unknown>){
  const expires=new Date(expiresAt);
  await this.pool.query(
   "insert into auth_challenges(id,challenge,metadata,expires_at) values($1,$2,$3::jsonb,$4) on conflict(id) do update set challenge=excluded.challenge,metadata=excluded.metadata,expires_at=excluded.expires_at",
   [key,challenge,JSON.stringify(metadata??{}),expires]
  );
 }

 async put(key:string,challenge:string,expiresAt:number){await this.putChallenge(key,challenge,expiresAt)}

 async take(key:string,now:number):Promise<string|null>{
  const client=await this.pool.connect();
  try{
   await client.query("begin");
   const result=await client.query(
    "delete from auth_challenges where id=$1 and expires_at>$2 returning challenge",
    [key,new Date(now)]
   );
   await client.query("commit");
   return result.rows[0]?.challenge??null;
  }catch(error){
   await client.query("rollback").catch(()=>{});
   throw error;
  }finally{client.release();}
 }

 async list(userId:string):Promise<StoredPasskey[]>{
  const result=await this.pool.query("select id,public_key,webauthn_user_id,counter,transports,device_type,backed_up from passkeys where account_id=$1::uuid",[userId]);
  return result.rows.map(row=>this.mapPasskey(row));
 }

 async getById(userId:string,credentialId:string):Promise<StoredPasskey|null>{
  const result=await this.pool.query("select id,public_key,webauthn_user_id,counter,transports,device_type,backed_up from passkeys where account_id=$1::uuid and id=$2",[userId,credentialId]);
  return result.rows[0]?this.mapPasskey(result.rows[0]):null;
 }

 async getByCredentialId(credentialId:string):Promise<{accountId:string;passkey:StoredPasskey}|null>{
  const result=await this.pool.query("select account_id::text as account_id,id,public_key,webauthn_user_id,counter,transports,device_type,backed_up from passkeys where id=$1",[credentialId]);
  if(!result.rows[0])return null;
  return {accountId:result.rows[0].account_id,passkey:this.mapPasskey(result.rows[0])};
 }

 async save(userId:string,passkey:StoredPasskey):Promise<void>{
  await this.pool.query(
   "insert into passkeys(id,account_id,webauthn_user_id,public_key,counter,transports,device_type,backed_up) values($1,$2::uuid,$3,$4,$5,$6,$7,$8)",
   [passkey.id,userId,passkey.webauthnUserID,Buffer.from(passkey.publicKey),passkey.counter,JSON.stringify(passkey.transports??[]),passkey.deviceType,passkey.backedUp]
  );
 }

 async updateCounter(credentialId:string,counter:number):Promise<void>{
  await this.pool.query("update passkeys set counter=greatest(counter,$2) where id=$1",[credentialId,counter]);
 }

 async createSession(record:SessionRecord){await this.pool.query("insert into sessions(id,account_id,device_id,token_hash,created_at,expires_at,revoked_at) values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7)",[record.id,record.accountId,record.deviceId,record.tokenHash,new Date(record.createdAt),new Date(record.expiresAt),record.revokedAt?new Date(record.revokedAt):null])}
 async create(record:SessionRecord){return this.createSession(record)}

 async getByTokenHash(tokenHash:string):Promise<SessionRecord|null>{
  const result=await this.pool.query("select id::text,account_id::text,device_id::text,token_hash,extract(epoch from created_at)*1000 as created_at,extract(epoch from expires_at)*1000 as expires_at,extract(epoch from revoked_at)*1000 as revoked_at from sessions where token_hash=$1",[tokenHash]);
  const row=result.rows[0];
  if(!row)return null;
  return {id:row.id,accountId:row.account_id,deviceId:row.device_id,tokenHash:row.token_hash,createdAt:Number(row.created_at),expiresAt:Number(row.expires_at),revokedAt:row.revoked_at===null?undefined:Number(row.revoked_at)};
 }

 async revoke(sessionId:string){await this.pool.query("update sessions set revoked_at=now() where id=$1::uuid",[sessionId])}
 async revokeDevice(deviceId:string){await this.pool.query("update sessions set revoked_at=now() where device_id=$1::uuid and revoked_at is null",[deviceId])}

 async createAccount(accountId:string,authSubject:string){await this.pool.query("insert into accounts(id,auth_subject) values($1::uuid,$2)",[accountId,authSubject])}
 async createDevice(deviceId:string,accountId:string,platform:"web"|"android"|"ios"|"desktop",appVersion:string){await this.pool.query("insert into devices(id,account_id,platform,app_version) values($1::uuid,$2::uuid,$3,$4)",[deviceId,accountId,platform,appVersion])}

 async registerAccount(input:{
  accountId:string;
  authSubject:string;
  passkey:StoredPasskey;
  deviceId:string;
  platform:"web"|"android"|"ios"|"desktop";
  appVersion:string;
  session:SessionRecord;
 }){
  const client=await this.pool.connect();
  try{
   await client.query("begin");
   await client.query("insert into accounts(id,auth_subject) values($1::uuid,$2)",[input.accountId,input.authSubject]);
   await client.query(
    "insert into passkeys(id,account_id,webauthn_user_id,public_key,counter,transports,device_type,backed_up) values($1,$2::uuid,$3,$4,$5,$6,$7,$8)",
    [input.passkey.id,input.accountId,input.passkey.webauthnUserID,Buffer.from(input.passkey.publicKey),input.passkey.counter,JSON.stringify(input.passkey.transports??[]),input.passkey.deviceType,input.passkey.backedUp]
   );
   await client.query(
    "insert into devices(id,account_id,platform,app_version) values($1::uuid,$2::uuid,$3,$4)",
    [input.deviceId,input.accountId,input.platform,input.appVersion]
   );
   await client.query(
    "insert into sessions(id,account_id,device_id,token_hash,created_at,expires_at,revoked_at) values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7)",
    [input.session.id,input.accountId,input.deviceId,input.session.tokenHash,new Date(input.session.createdAt),new Date(input.session.expiresAt),input.session.revokedAt?new Date(input.session.revokedAt):null]
   );
   await client.query("commit");
  }catch(error){
   await client.query("rollback").catch(()=>{});
   throw error;
  }finally{client.release();}
 }

 async createDeviceAndSession(input:{
  deviceId:string;
  accountId:string;
  platform:"web"|"android"|"ios"|"desktop";
  appVersion:string;
  session:SessionRecord;
 }){
  const client=await this.pool.connect();
  try{
   await client.query("begin");
   await client.query("insert into devices(id,account_id,platform,app_version) values($1::uuid,$2::uuid,$3,$4)",[input.deviceId,input.accountId,input.platform,input.appVersion]);
   await client.query("insert into sessions(id,account_id,device_id,token_hash,created_at,expires_at,revoked_at) values($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7)",[input.session.id,input.accountId,input.deviceId,input.session.tokenHash,new Date(input.session.createdAt),new Date(input.session.expiresAt),input.session.revokedAt?new Date(input.session.revokedAt):null]);
   await client.query("commit");
  }catch(error){
   await client.query("rollback").catch(()=>{});
   throw error;
  }finally{client.release();}
 }

 private mapPasskey(row:any):StoredPasskey{
  let transports:AuthenticatorTransportFuture[]|undefined;
  try{
   const parsed=JSON.parse(String(row.transports??"[]"));
   if(Array.isArray(parsed))transports=parsed as AuthenticatorTransportFuture[];
  }catch{transports=undefined}
  return {
   id:String(row.id),
   publicKey:new Uint8Array(row.public_key),
   webauthnUserID:String(row.webauthn_user_id),
   counter:Number(row.counter),
   transports,
   deviceType:String(row.device_type) as StoredPasskey["deviceType"],
   backedUp:Boolean(row.backed_up)
  };
 }
}
