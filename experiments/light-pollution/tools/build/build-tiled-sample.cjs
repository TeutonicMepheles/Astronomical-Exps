const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
execFileSync(process.execPath,[path.join(__dirname,'tiled-layout.cjs'),...(process.argv[2]?[process.argv[2]]:[])],{stdio:'inherit'});
require('./build-panorama.cjs');
const init=fs.readFileSync(path.join(root,'scenes/tiled-sample/layout.js'),'utf8');
for(const mode of ['editor','user']){
 const html=fs.readFileSync(path.join(root,'assets/panorama-20261111/'+mode+'.html'),'utf8');
 fs.writeFileSync(path.join(root,'scenes/tiled-sample/'+mode+'.html'),html.replace('</head>','<script>'+init+'</script></head>'));
}
console.log('Built Tiled sample using the existing panoramic page, with embedded offline assets.');
