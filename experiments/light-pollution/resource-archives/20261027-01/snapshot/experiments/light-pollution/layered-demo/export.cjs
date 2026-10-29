const fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8');
const assets={};for(const file of fs.readdirSync(path.join(__dirname,'assets')).filter(f=>f.endsWith('.png')))assets['assets/'+file]='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets',file)).toString('base64');
let html=read('index.html').replace('<link rel="stylesheet" href="../../../shared/typography/typography.css">','<style>'+read('../../../shared/typography/typography.css')+'</style>').replace('<link rel="stylesheet" href="style.css">','<style>'+read('style.css')+'</style>').replace('<script src="app.js" defer></script>','');
html=html.replace('</body>','<script>window.DEMO_ASSETS='+JSON.stringify(assets)+';</script><script>'+read('app.js')+'</script></body>');
fs.writeFileSync(path.join(__dirname,'standalone.html'),html);console.log('Exported offline standalone.html with '+Object.keys(assets).length+' images.');
