export interface LocalStore<T>{get():Promise<T|null>;set(value:T):Promise<void>;clear():Promise<void>}
export class MemoryStore<T> implements LocalStore<T>{
 private value:T|null=null;
 async get(){return this.value}
 async set(value:T){this.value=value}
 async clear(){this.value=null}
}
export function browserStore<T>(key:string,storage:Storage=globalThis.localStorage):LocalStore<T>{
 return {
  async get(){const raw=storage.getItem(key);return raw?JSON.parse(raw) as T:null},
  async set(value){storage.setItem(key,JSON.stringify(value))},
  async clear(){storage.removeItem(key)}
 };
}
