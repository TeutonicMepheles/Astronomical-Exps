const fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8'),assets={};
for(const f of fs.readdirSync(path.join(__dirname,'assets')).filter(f=>f.endsWith('.png')&&!['composite.png','reference.png'].includes(f)))assets['assets/'+f]='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets',f)).toString('base64');
let html=read('index.html').replace('<link rel="stylesheet" href="../../../shared/typography/typography.css">','<style>'+read('../../../shared/typography/typography.css')+'</style>').replace('<link rel="stylesheet" href="style.css">','<style>'+read('style.css')+'</style>').replace('<script src="app.js" defer></script>','');
html=html.replace('</body>','<script>window.STATIC_ASSETS='+JSON.stringify(assets)+';</script><script>'+read('app.js')+'</script></body>');fs.writeFileSync(path.join(__dirname,'standalone.html'),html);console.log('Static offline entry exported.');
