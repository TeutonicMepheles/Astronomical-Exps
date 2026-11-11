/* Optional scene pack: existing runtime, separate document identity and offline assets. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'assets/panorama-20261111');
const outputFolder=folder;
const layout=JSON.parse(fs.readFileSync(path.join(outputFolder,'layout.json'),'utf8'));
require('./build.cjs');
const assets=Object.fromEntries([...new Set([...layout.layers,...(layout.stadiumParts||[])].flatMap(l=>[l.file,...(l.lightMask?[l.lightMask]:[])]))].map(file=>['../assets/panorama-20261111/'+file,'data:image/'+(file.endsWith('.jpg')?'jpeg':'png')+';base64,'+fs.readFileSync(path.join(folder,file)).toString('base64')]));
const sceneInit='<script>window.LIGHT_POLLUTION_SCENE="panorama-20261111";document.documentElement.dataset.appMode="editor";window.LP_PANORAMA_LAYOUT='+JSON.stringify(layout)+';</script>';
const inject='<script>window.LIB_STATIC_ASSETS=Object.assign(window.LIB_STATIC_ASSETS||{},'+JSON.stringify(assets)+');</script>';
let html=fs.readFileSync(path.join(root,'lib-static-demo/standalone.html'),'utf8');
// Inject after the base asset registry and before runtime bootstrap.
const marker='<script>/* Static assembly of Lib Image output.';
if(!html.includes(marker))throw Error('Bootstrap marker not found');
html=html.replace('</head>',sceneInit+'</head>').replace(marker,inject+marker);
fs.writeFileSync(path.join(outputFolder,'editor.html'),html);
console.log('Built optional panoramic offline editor:',layout.layers.length,'layers');

fs.writeFileSync(path.join(outputFolder,'user.html'),html.replace('dataset.appMode="editor"','dataset.appMode="user"'));
