/* Audit the manifest, not the implementation of the build script. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const inputs=[...new Set(['app/page.html',...manifest.scripts,...manifest.styles,...Object.values(manifest.assets)])];
const records=inputs.map(file=>{const b=fs.readFileSync(path.resolve(root,file));const ids=Object.entries(manifest.assets).filter(([,v])=>v===file).map(([k])=>k);let dimensions=null;if(b.subarray(1,4).toString()==='PNG')dimensions=[b.readUInt32BE(16),b.readUInt32BE(20)];return {path:file,bytes:b.length,sha256:hash(b),resourceIds:ids,dimensions};});
const output=fs.readFileSync(path.join(root,'lib-static-demo/standalone.html'));
const result={schema:1,scripts:manifest.scripts,styles:manifest.styles,resources:records.filter(x=>x.resourceIds.length),inputs:records,standalone:{bytes:output.length,sha256:hash(output)},remoteExecutableDependencies:/<(?:script|link)\b[^>]*(?:src|href)=["']https?:/i.test(output.toString())};
if(result.remoteExecutableDependencies)throw Error('Remote runtime dependency');
fs.writeFileSync(path.join(root,'docs/dependencies.json'),JSON.stringify(result,null,2)+'\n');
console.log(`Audited ${records.length} inputs, ${result.resources.length} declared image resources; no remote executable dependency.`);
