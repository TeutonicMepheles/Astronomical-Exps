const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1920,height:1080}}),root=path.resolve(__dirname,'../assets/blueprint-flat');
 for(const phase of ['01-recognition','02-assembly']){
  const svg=fs.readFileSync(path.join(root,phase+'-ink.svg'),'utf8');
  if(/NaN|Infinity/.test(svg))throw Error('Invalid blueprint geometry');
  await p.setContent('<style>html,body{margin:0;background:transparent}svg{display:block}</style>'+svg);
  await p.screenshot({path:path.join(root,phase+'-ink.png'),omitBackground:true});
 }
 console.log('Rasterized recognition/assembly ink from current SVG geometry');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
