import {readFileSync,readdirSync} from "node:fs";
import {join} from "node:path";

const root=new URL("../apps/extension/",import.meta.url);
const manifest=JSON.parse(readFileSync(new URL("manifest.json",root),"utf8"));
const forbiddenPermissions=["webRequestBlocking","debugger","management","history","cookies","clipboardRead","clipboardWrite"];
for(const permission of manifest.permissions??[]){if(forbiddenPermissions.includes(permission))throw new Error("Forbidden extension permission: "+permission);}
if(JSON.stringify(manifest).includes("http://"))throw new Error("HTTP reference found in extension manifest");
if(manifest.externally_connectable)throw new Error("externally_connectable must be explicitly reviewed before use");

function walk(dir){
 const out=[];
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,entry.name);
  if(entry.isDirectory()&&!["node_modules","dist"].includes(entry.name))out.push(...walk(p));
  else if(entry.isFile()&&/\.(?:js|ts|html)$/.test(entry.name))out.push(p);
 }
 return out;
}
for(const file of walk(root.pathname)){
 const source=readFileSync(file,"utf8");
 if(/\beval\s*\(|\bnew\s+Function\s*\(|document\.write\s*\(|\.innerHTML\s*=/.test(source))throw new Error("Unsafe API pattern found in "+file);
 if(/<script[^>]+src=["']https?:\/\//i.test(source))throw new Error("Remote script reference found in "+file);
}
console.log("Extension security checks passed.");