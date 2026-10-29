/* Manifest-only offline build. All paths are local and source assets remain byte-identical. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'lib-static-demo');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8'));
const inputs=[];
function read(relative){const file=path.resolve(root,relative);if(!file.startsWith(path.resolve(root,'../..')+path.sep))throw Error('Input outside repository: '+relative);const bytes=fs.readFileSync(file);inputs.push({path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});return bytes;}
if(new Set(manifest.scripts).size!==manifest.scripts.length)throw Error('Duplicate scripts');
const template=read('app/page.html').toString('utf8');
const assets=Object.fromEntries(Object.entries(manifest.assets).map(([id,file])=>[id,'data:image/'+(file.endsWith('.svg')?'svg+xml':'png')+';base64,'+read(file).toString('base64')]));
const styles=manifest.styles.map(file=>'<style>'+read(file).toString('utf8')+'</style>').join('');
const scripts=manifest.scripts.map(file=>'<script>'+read(file).toString('utf8')+'</script>').join('');
const offline=template.replace('</head>',styles+'</head>').replace('</body>','<script>window.LIB_STATIC_ASSETS='+JSON.stringify(assets)+';</script>'+scripts+'</body>');
if(/<(?:script|link)\b[^>]*(?:src|href)=/i.test(offline))throw Error('Unbundled executable dependency');
function write(file,text){const destination=path.join(root,file);fs.writeFileSync(destination+'.tmp',text);fs.renameSync(destination+'.tmp',destination);}
write('lib-static-demo/standalone.html',offline);
write('lib-static-demo/README.md',fs.readFileSync(path.join(__dirname,'compatibility-readme.md'),'utf8'));
const tags=manifest.styles.map(file=>`<link rel="stylesheet" href="../${file}">`).join('')+manifest.scripts.map(file=>`<script src="../${file}" defer></script>`).join('');
const source=template.replace('</head>',tags+'</head>');
const redirect='<script>if(location.protocol==="file:")location.replace("../lib-static-demo/standalone.html"+location.search+location.hash);</script>';
write('lib-static-demo/index.html',source.replace('<head>','<head>'+redirect));
write('app/index.html',source.replace('<head>','<head><base href="../lib-static-demo/">'+redirect));
write('tools/build/inputs.json',JSON.stringify({version:1,inputs,output:{path:'lib-static-demo/standalone.html',bytes:Buffer.byteLength(offline),sha256:crypto.createHash('sha256').update(offline).digest('hex')}},null,2)+'\n');
console.log('Built candidate + legacy offline scene from '+inputs.length+' declared inputs.');
