export interface AuthenticatedContext{accountId:string;deviceId:string}
export interface AccountRecord{id:string;authSubject:string;createdAt:number;disabledAt?:number}
export interface DeviceRecord{id:string;accountId:string;platform:"web"|"android"|"ios"|"desktop";appVersion:string;createdAt:number;revokedAt?:number}
export interface EntitlementRecord{accountId:string;plan:"free"|"premium"|"family"|"team";status:"active"|"inactive"|"past_due";expiresAt?:number}
export interface StoredVault{accountId:string;ciphertextEnvelope:string;version:number;updatedAt:number}
