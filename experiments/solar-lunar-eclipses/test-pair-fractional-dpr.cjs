const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=__dirname+'/docs/fractional-dpr-20261116';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome'});try{const results=[];
 for(const dpr of [1,1.1,1.25,1.333,1.75,2]){
  const context=await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:dpr}),p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.ECLIPSE_URL||'http://127.0.0.1:8876/experiments/solar-lunar-eclipses/'));await p.waitForTimeout(300);
  for(const kind of ['total','partial','annular','lunar']){
   await p.locator(`[data-event=${kind}]`).click();if(kind!=='lunar')await p.locator('#observerCandidates button').nth(2).click();await p.waitForTimeout(100);
   const samples=await p.locator('#scene').evaluate(e=>{const c=e.getContext('2d'),d=devicePixelRatio,views=JSON.parse(e.dataset.observationViews);return views.map(v=>{const q=v.bounds.panel,x=Math.round(q.x*d),y=Math.round(q.y*d),w=Math.floor(q.width*d),h=Math.floor(q.height*d),pixels=c.getImageData(x,y,w,h).data;let gold=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>150&&pixels[i+1]>120&&pixels[i+2]<210)gold++;const r=v.radius*d,im=c.getImageData(Math.floor((v.earth.x-v.radius)*d),Math.floor((v.earth.y-v.radius)*d),Math.ceil(2*r),Math.ceil(2*r));let bright=0,total=0;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if((x-r)**2+(y-r)**2<r*r){total++;const i=(y*im.width+x)*4;if(im.data[i]>50&&im.data[i+1]>50&&im.data[i+2]>50)bright++;}return {camera:v.camera,gold,earthBrightRatio:bright/total};});});
   assert.equal(samples.length,2);for(const sample of samples){assert(sample.gold>80,`missing ${sample.camera} orbit pixels at DPR ${dpr}, ${kind}`);assert(sample.earthBrightRatio>.15,`missing ${sample.camera} globe at DPR ${dpr}, ${kind}`);}results.push({dpr,kind,samples});
  }
  await p.screenshot({path:out+'/dpr-'+dpr+'.png'});assert.deepEqual(errors,[]);await context.close();
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify({pass:true,results},null,2));console.log('PASS actual pixels in both panes: 6 device scales x 4 eclipse types, including observer C; no missing left pane');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
