import {build} from "esbuild";
import {rmSync,mkdirSync,copyFileSync,readFileSync,writeFileSync} from "node:fs";

rmSync("dist",{recursive:true,force:true});
mkdirSync("dist",{recursive:true});

await Promise.all([
 build({entryPoints:["src/background.ts"],bundle:true,format:"esm",platform:"browser",target:"es2022",outfile:"dist/background.js",sourcemap:false}),
 build({entryPoints:["src/content.ts"],bundle:true,format:"iife",platform:"browser",target:"es2022",outfile:"dist/content.js",sourcemap:false}),
 build({entryPoints:["src/popup.ts"],bundle:true,format:"iife",platform:"browser",target:"es2022",outfile:"dist/popup.js",sourcemap:false})
]);

const manifest=JSON.parse(readFileSync("manifest.json","utf8"));
manifest.action={...manifest.action,default_popup:"popup.html"};
writeFileSync("dist/manifest.json",JSON.stringify(manifest,null,2));
copyFileSync("src/popup.html","dist/popup.html");
copyFileSync("options.html","dist/options.html");
