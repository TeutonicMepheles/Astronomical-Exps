/* Serial browser runs avoid GPU contention. Any failure keeps its output and fails the run. */
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),directory=path.join(root,'tests/browser');
const tests=fs.readdirSync(directory).filter(f=>f.endsWith('.cjs')).sort();const results=[];
for(const file of tests){const start=Date.now(),r=spawnSync(process.execPath,[path.join(directory,file)],{encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});const pass=r.status===0;results.push({file,pass,ms:Date.now()-start,output:(r.stdout||'')+(r.stderr||''),error:r.error?.message});console.log(`${pass?'PASS':'FAIL'} ${file} (${Date.now()-start}ms)`);}
fs.writeFileSync(path.join(root,'docs/browser-results.json'),JSON.stringify(results,null,2));if(results.some(r=>!r.pass))process.exitCode=1;
