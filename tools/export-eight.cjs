/* Standalone packaging: rewrite resource call sites, never patch browser prototypes. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const esbuild=require('esbuild'),acorn=require('acorn'),walk=require('acorn-walk');
let MagicString;
const out=path.resolve(process.argv[2]||path.join(root,'dist/eight-pages-20261118'));
const origin='https://offline.invalid/';
const experiments=['foucault-pendulum','lunar-crater-height','meteor-impact','earth-circumference','light-pollution','solar-lunar-eclipses','newton-telescope','rocket-launch'];
const titles=['01_傅科摆','02_月面环形山高度','03_陨石坑撞击','04_地球周长','05_光污染与夜天光','06_日月食','07_牛顿望远镜','08_火箭发射'];
const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.glb':'model/gltf-binary','.mp4':'video/mp4','.webm':'video/webm','.json':'application/json','.bin':'application/octet-stream','.wasm':'application/wasm','.txt':'text/plain'};
const canonical=f=>origin+path.relative(root,f).split(path.sep).join('/');
const esc=s=>s.replace(/<\/script/gi,'<\\/script');
const read=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');
fs.mkdirSync(out,{recursive:true});
async function build(name,index){
 const dir=path.join(root,'experiments',name),target=path.join(out,titles[index]+'.html');
 if(name==='light-pollution'||name==='newton-telescope'){
  cp.execFileSync('python',['tools/export.py',name],{cwd:root,stdio:'pipe'});
  fs.copyFileSync(path.join(root,'dist',name,'index.html'),target);
  return {experiment:name,file:path.basename(target),source:'experiments/'+name+'/index.html',bytes:fs.statSync(target).size};
 }
 let entry=path.join(dir,'index.html'),html=read(entry);
 const redirect=html.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)/i);
 if(redirect){entry=path.resolve(dir,decodeURIComponent(redirect[1]));html=read(entry);}
 const base=path.dirname(entry),assets=new Map(),seen=new Set();
 const isInside=f=>f.startsWith(root+path.sep);
 function add(f){
  f=path.resolve(f);if(!isInside(f)||!fs.existsSync(f)||!fs.statSync(f).isFile()||!mime[path.extname(f).toLowerCase()]||assets.has(f))return;
  assets.set(f,null);
  if(path.extname(f)==='.json'){
   try{const visit=x=>{if(typeof x==='string')consider(x,path.dirname(f));else if(x&&typeof x==='object')Object.values(x).forEach(visit);};visit(JSON.parse(read(f)));}catch(e){throw new Error('Invalid JSON '+f+': '+e.message);}
  }
 }
 function tree(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(['source','sources','original','originals','review','docs','references','resource-archives'].includes(ent.name))continue;const f=path.join(dir,ent.name);if(ent.isDirectory())tree(f);else if(!/(?:generation|prompt|provenance|validation)/i.test(ent.name))add(f);}}
 function consider(s,from){
  if(!s||s.length>1200||/^(?:data:|blob:|#|https?:|[a-z]+:)/i.test(s))return;
  const urls=[...s.matchAll(/url\(["']?([^\)"']+)["']?\)/g)].map(m=>m[1]);if(urls.length){urls.forEach(x=>consider(x,from));return;}
  if(s.includes('<')){for(const m of s.matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/g))consider(m[1],from);return;}
  s=s.split(/[?#]/)[0];if(!s||/[\n\r<>={}]/.test(s))return;
  const candidates=[path.resolve(from,s),path.resolve(base,s)];
  for(const f of candidates){
   if(!isInside(f))continue;
   if(fs.existsSync(f)){if(fs.statSync(f).isFile())add(f);else if(s.includes('assets/')||s.endsWith('/'))tree(f);continue;}
   if((s.includes('assets/')||s.startsWith('./assets'))&&fs.existsSync(path.dirname(f))&&fs.statSync(path.dirname(f)).isDirectory()){
    const prefix=path.basename(f);for(const ent of fs.readdirSync(path.dirname(f),{withFileTypes:true})){if(ent.name.startsWith(prefix)){const q=path.join(path.dirname(f),ent.name);if(ent.isDirectory())tree(q);else add(q);}}
   }
  }
 }
 function transform(source,file){
  const code=read(file),url=canonical(file),from=path.dirname(file);
  if(code.length>8e6)return code; // Existing generated model tables contain no resource calls.
  const ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'module',allowReturnOutsideFunction:true}),ms=new MagicString(code);
  const wrap=(node,kind='__offlineResolve')=>{ms.prependLeft(node.start,kind+'(');ms.appendRight(node.end,','+JSON.stringify(url)+')');};
  walk.simple(ast,{
   Literal(n){if(typeof n.value==='string')consider(n.value,from);},
   TemplateLiteral(n){if(n.quasis.length)consider(n.quasis[0].value.cooked,from);},
   MetaProperty(n){if(code.slice(n.start,n.end)==='import.meta')ms.overwrite(n.start,n.end,'({url:'+JSON.stringify(url)+'})');},
   MemberExpression(n){if(code.slice(n.start,n.end)==='document.baseURI')ms.overwrite(n.start,n.end,JSON.stringify(canonical(entry)));if(code.slice(n.start,n.end)==='document.currentScript.src')ms.overwrite(n.start,n.end,JSON.stringify(url));},
   AssignmentExpression(n){if(n.left.type==='MemberExpression'){const prop=n.left.property.name||n.left.property.value;if(['src','href','poster'].includes(prop))wrap(n.right);if(prop==='backgroundImage')wrap(n.right,'__offlineCSS');if(prop==='innerHTML')wrap(n.right,'__offlineHTML');}},
   CallExpression(n){
    const callee=n.callee,prop=callee.type==='MemberExpression'?(callee.property.name||callee.property.value):'';
    if(n.arguments[0]&&((callee.type==='Identifier'&&callee.name==='fetch')||['load','loadAsync','setSource'].includes(prop)))wrap(n.arguments[0]);
    if(prop==='insertAdjacentHTML'&&n.arguments[1])wrap(n.arguments[1],'__offlineHTML');
    if(prop==='setAttribute'&&n.arguments.length>=2&&['src','href','xlink:href','poster'].includes(n.arguments[0].value))wrap(n.arguments[1]);
   }
  });
  let result=ms.toString();
  // Delivery always starts in ordinary teaching mode, irrespective of URL flags.
  result=result.replace("const developerMode=new URLSearchParams(location.search).get('dev')==='1'","const developerMode=false");
  return result;
 }
 const plugin={name:'standalone-resources',setup(build){
  build.onResolve({filter:/\?/},args=>({path:path.resolve(args.resolveDir,args.path.split('?')[0])}));
  build.onLoad({filter:/\.(?:m?js|cjs)$/},args=>{seen.add(args.path);return{contents:transform(null,args.path),loader:'js',resolveDir:path.dirname(args.path)};});
 }};
 function uri(f){add(f);const ext=path.extname(f).toLowerCase();return 'data:'+mime[ext]+';base64,'+fs.readFileSync(f).toString('base64');}
 function css(file){return read(file).replace(/@import\s+["']([^"']+)["'];?/g,(_,v)=>css(path.resolve(path.dirname(file),v))).replace(/url\((["']?)(.*?)\1\)/g,(all,q,v)=>/^(?:data:|#)/.test(v)?all:'url("'+uri(path.resolve(path.dirname(file),v.split('?')[0]))+'")');}
 html=html.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi,(all,ref)=>/rel=["']stylesheet/.test(all)?'<style>'+css(path.resolve(base,ref.split('?')[0]))+'</style>':all);
 html=html.replace(/<style>([\s\S]*?)<\/style>/gi,(_,text)=>'<style>'+text.replace(/url\((["']?)(.*?)\1\)/g,(all,q,v)=>/^(?:data:|#)/.test(v)?all:'url("'+uri(path.resolve(base,decodeURIComponent(v.split('?')[0])))+'")')+'</style>');
 html=html.replace(/\b(src|poster|href)=["']([^"']+)["']/gi,(all,attr,v)=>{if(/^(?:data:|https?:|#)/.test(v)||/\.js(?:\?|$)/.test(v))return all;const f=path.resolve(base,decodeURIComponent(v.split('?')[0]));return fs.existsSync(f)&&fs.statSync(f).isFile()?attr+'="'+uri(f)+'"':all;});
 const blocks=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)],replacements=[];
 for(const block of blocks){
  const attrs=block[1],src=attrs.match(/\bsrc=["']([^"']+)["']/),module=/\btype=["']module["']/.test(attrs);
  if(!src)continue;
  const file=path.resolve(base,src[1].split('?')[0]);seen.add(file);
  let code;
  if(module){const built=await esbuild.build({entryPoints:[file],bundle:true,write:false,format:'iife',target:'chrome110',plugins:[plugin],logLevel:'silent'});code=built.outputFiles[0].text;}
  else code=transform(null,file);
  const replacement='<script'+(!module&&/\bdefer\b/.test(attrs)?' data-offline-defer="1"':'')+'>'+esc(code)+'</script>';
  replacements.push([block[0],replacement,!module&&/\bdefer\b/.test(attrs)]);
 }
 const deferred=[];for(const [old,replacement,defer]of replacements){html=html.replace(old,()=>defer?'':replacement);if(defer)deferred.push(replacement);}
 // Plain inline scripts can also reference external resources.
 html=html.replace('</body>',()=>deferred.join('\n')+'</body>');
 const table={};for(const f of assets.keys())table[new URL(canonical(f)).pathname]=uri(f);
 const bootstrap=`<script>/* Embedded resource transport; bounded by the packaged asset set. */
(()=>{const resources=${JSON.stringify(table)},cache=new Map();
window.__offlineResolve=(value,base)=>{if(typeof value!=='string'&&!(value instanceof URL))return value;const s=String(value);if(/^(data:|blob:|#)/.test(s))return value;let key;try{key=new URL(s,base).pathname}catch{return value}if(!resources[key]){key=new URL(s,${JSON.stringify(canonical(entry))}).pathname;}const data=resources[key];if(!data)return value;if(!cache.has(key)){const comma=data.indexOf(','),raw=atob(data.slice(comma+1)),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);cache.set(key,URL.createObjectURL(new Blob([bytes],{type:data.slice(5,data.indexOf(';'))})));}return cache.get(key);};
window.__offlineHTML=(value,base)=>typeof value==='string'?value.replace(/\\b(src|href|poster)=["']([^"']+)["']/g,(_,attr,url)=>attr+'="'+__offlineResolve(url,base)+'"'):value;
window.__offlineCSS=(value,base)=>typeof value==='string'?value.replace(/url\\((['"]?)(.*?)\\1\\)/g,(_,q,url)=>'url("'+__offlineResolve(url,base)+'")'):value;
addEventListener('pagehide',e=>{if(!e.persisted){for(const url of cache.values())URL.revokeObjectURL(url);cache.clear();}});
document.documentElement.classList.remove('developer-mode');})();</script>`;
 html=html.replace('</head>',()=>bootstrap+'<style>html:not(.developer-mode) #debugButton,html:not(.developer-mode) #debugPanel{display:none!important}</style></head>');
 fs.writeFileSync(target,html);
 return {experiment:name,file:path.basename(target),source:path.relative(root,entry).split(path.sep).join('/'),bytes:fs.statSync(target).size,assets:assets.size,modules:seen.size};
}
(async()=>{MagicString=(await import('magic-string')).default;const rows=[];const only=process.env.EXPORT_ONLY;for(let i=0;i<experiments.length;i++){if(only&&!only.split(',').includes(experiments[i]))continue;const row=await build(experiments[i],i);row.sha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,row.file))).digest('hex');rows.push(row);console.log(row.file,(row.bytes/1048576).toFixed(2)+' MiB',row.assets||'existing exporter');}
 const manifest={exporterSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),mode:'ordinary teaching mode; no developer URL flags',files:rows};fs.writeFileSync(path.join(out,only?'manifest-partial.json':'manifest.json'),JSON.stringify(manifest,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
