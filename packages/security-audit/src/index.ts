export type SecurityEventType=
 "login_failed"|"session_revoked"|"device_revoked"|"permission_changed"|"local_data_deleted"|
 "encrypted_export_created"|"key_rotation"|"extension_updated"|"security_error";

export interface SecurityEvent{
 version:1;
 id:string;
 type:SecurityEventType;
 occurredAt:number;
 outcome:"success"|"failure";
}

const ALLOWED=new Set<SecurityEventType>([
 "login_failed","session_revoked","device_revoked","permission_changed","local_data_deleted",
 "encrypted_export_created","key_rotation","extension_updated","security_error"
]);

export function createSecurityEvent(type:SecurityEventType,outcome:SecurityEvent["outcome"],occurredAt=Date.now()):SecurityEvent{
 if(!ALLOWED.has(type))throw new Error("unsupported security event");
 if(!Number.isFinite(occurredAt))throw new Error("invalid timestamp");
 return {version:1,id:crypto.randomUUID(),type,occurredAt,outcome};
}

export function redactSecurityEvent(value:unknown):SecurityEvent{
 if(!value||typeof value!=="object")throw new Error("invalid security event");
 const v=value as Record<string,unknown>;
 if(v.version!==1||typeof v.id!=="string"||!ALLOWED.has(v.type as SecurityEventType)||typeof v.occurredAt!=="number"||!["success","failure"].includes(String(v.outcome))){
  throw new Error("invalid security event");
 }
 return {
  version:1,
  id:v.id.slice(0,80),
  type:v.type as SecurityEventType,
  occurredAt:v.occurredAt,
  outcome:v.outcome as SecurityEvent["outcome"]
 };
}

export function assertNoBehavioralFields(value:unknown){
 if(!value||typeof value!=="object")return;
 for(const key of Object.keys(value as Record<string,unknown>)){
  if(/url|domain|title|content|query|search|message|screen|keylog|clipboard|location|notification/i.test(key)){
   throw new Error("behavioral field not allowed in security audit");
  }
 }
}
