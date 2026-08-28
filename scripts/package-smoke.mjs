import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os"; import { join } from "node:path"; import { spawnSync } from "node:child_process";
const cwd=new URL("..",import.meta.url).pathname; const temp=await mkdtemp(join(tmpdir(),"repopack-smoke-"));
try {
 const pack=spawnSync("npm",["pack","--json","--ignore-scripts"],{cwd,encoding:"utf8"}); if(pack.status!==0) throw new Error(pack.stderr);
 const name=JSON.parse(pack.stdout)[0].filename; const tarball=join(cwd,name);
 await writeFile(join(temp,"package.json"),JSON.stringify({type:"module"}));
 const install=spawnSync("npm",["install","--ignore-scripts",tarball],{cwd:temp,encoding:"utf8"}); if(install.status!==0) throw new Error(install.stderr);
 const script='import { canonicalStringify } from "@mturac/repopack"; console.log(canonicalStringify({b:1,a:2}));';
 await writeFile(join(temp,"smoke.mjs"),script); const run=spawnSync(process.execPath,["smoke.mjs"],{cwd:temp,encoding:"utf8"}); if(run.status!==0||!run.stdout.includes('{"a":2,"b":1}')) throw new Error(run.stderr||run.stdout);
 const cli=spawnSync(process.execPath,[join(temp,"node_modules/@mturac/repopack/bin/repopack.mjs"),"--version"],{cwd:temp,encoding:"utf8"}); if(cli.status!==0||cli.stdout.trim()!=="0.1.0") throw new Error(cli.stderr||cli.stdout);
 await rm(tarball,{force:true}); process.stdout.write("Package smoke verified.\n");
} finally { await rm(temp,{recursive:true,force:true}); }
