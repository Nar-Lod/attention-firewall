import {readFileSync,readdirSync} from "node:fs";
import {join} from "node:path";

const root=new URL("../apps/extension/",import.meta.url);
const manifest=JSON.parse(readFileSync(new URL("manifest.json",root),"utf8"));

const allowedRequired=["storage","scripting"];
const required=manifest.permissions??[];
for(const permission of required){
 if(!allowedRequired.includes(permission))throw new Error("Unapproved required extension permission: "+permission);
}
if(manifest.host_permissions?.length)throw new Error("Permanent host permissions are forbidden");
if(manifest.content_scripts?.length)throw new Error("Static content scripts are forbidden; use explicit optional web access");
if(!Array.isArray(manifest.optional_host_permissions)||!manifest.optional_host_permissions.every((x)=>x==="https://*/*")){
 throw new Error("Optional web access must be HTTPS-only and broad access must remain opt-in");
}
if(JSON.stringify(manifest).includes("http://"))throw new Error("HTTP reference found in extension manifest");
if(manifest.externally_connectable)throw new Error("externally_connectable requires explicit security review");
if(!manifest.content_security_policy?.extension_pages?.includes("script-src 'self'"))throw new Error("Missing strict extension CSP");

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
 if(/\beval\s*\(|\bnew\s+Function\s*\(|document\.write\s*\(|\.innerHTML\s*=/.test(source)){
  throw new Error("Unsafe API pattern found in "+file);
 }
 if(/<script[^>]+src=["']https?:\/\//i.test(source))throw new Error("Remote script reference found in "+file);
 if(/chrome\.permissions\.request\(\{[^}]*origins:\s*\[\s*["']https:\/\/\*\/\*["']/.test(source))throw new Error("Runtime broad host permission request found in "+file);
 if(/matches:\s*\[\s*["']https:\/\/\*\/\*["']/.test(source))throw new Error("Broad content-script match found in "+file);
}
console.log("Extension security checks passed.");
