// Synchronize two drafting sheets with the current tank material coding and actual ring layout.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'assets'),sheets=path.join(assets,'blueprint-flat');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const policy=JSON.parse(fs.readFileSync(path.join(assets,'cz7-kiu-20261116/interior-layout-policy.json'))),draft=JSON.parse(fs.readFileSync(path.join(assets,'cz7-kiu-20261116/internal-drafting-layout.json'))),boxes=JSON.parse(fs.readFileSync(path.join(sheets,'interior-path-bounds.json'))),layout=JSON.parse(fs.readFileSync(path.join(sheets,'hotspots.json'))).assemblyLayout;
 const p=await b.newPage({viewport:{width:1600,height:900}});await p.goto('http://127.0.0.1:9041/experiments/rocket-launch/');await p.getByRole('button',{name:'结构与组装'}).click();await p.waitForFunction(()=>RocketChapter3.adapter.ready);
 const projected=await p.evaluate(async policy=>{
  const T=await import('./vendor/three/three.module.js'),{selectionContours}=await import('./selection-contours.js'),a=RocketChapter3.adapter,result={};a.scene.updateMatrixWorld(true);a.camera.updateMatrixWorld(true);const towards=a.camera.getWorldDirection(new T.Vector3()).negate();
  for(const [name,spec]of Object.entries(policy.tanks)){
   const node=a.nodes[name],rings=[];
   for(const height of spec.ringCentres){const arcs=[];let current=[];
    for(let i=0;i<=96;i++){
     const angle=i*Math.PI*2/96,normal=new T.Vector3(Math.cos(angle),0,Math.sin(angle)).transformDirection(node.matrixWorld),visible=normal.dot(towards)>=0;
     if(visible){const q=node.localToWorld(new T.Vector3(spec.barrelDiameter/2*Math.cos(angle),height,spec.barrelDiameter/2*Math.sin(angle))).project(a.camera);current.push([(q.x+1)*a.host.clientWidth/2,(1-q.y)*a.host.clientHeight/2]);}
     else if(current.length){arcs.push(current);current=[];}
    }
    if(current.length)arcs.push(current);rings.push(arcs.filter(v=>v.length>1));
   }
   result[name]={rings,contour:selectionContours.entries[name],stageFloor:a.manifest.defaultTransformsGLTF[name.startsWith('Stage1')?'Stage1':'Stage2'].translation[1]};
  }return result;
 },policy);
 const fmt=n=>Number(n.toFixed(2)),report={recognition:{},assembly:{}};
 for(const phase of ['recognition','assembly']){
  const details={};
  for(const [name,spec]of Object.entries(policy.tanks)){
   let d='';
   if(phase==='recognition'){
    for(const y of spec.ringCentres){const x=draft.intercept+draft.slope*(y+projected[name].stageFloor),r=spec.barrelDiameter/2*-draft.slope;d+=`M${fmt(x)},${fmt(draft.radialCentre-r)}L${fmt(x)},${fmt(draft.radialCentre+r)}`;}
   }else{
    const c=projected[name].contour,r=boxes[name],w=c.crop.width-24,h=c.crop.height-24,t=layout?.transforms[name],k=t?.scale??Math.min(r.width/w,r.height/h),tx=t?.tx??r.x+(r.width-w*k)/2-12*k,ty=t?.ty??r.y+(r.height-h*k)/2-12*k;
    for(const arcs of projected[name].rings)for(const arc of arcs)d+=arc.map(([x,y],i)=>(i?'L':'M')+fmt((x-c.crop.x)*k+tx)+','+fmt((y-c.crop.y)*k+ty)).join('');
   }
   details[name]=d;report[phase][name]={type:spec.surfaceType,ringCount:spec.ringCentres.length,modelPitch:policy.ringPitch};
  }
  for(const suffix of ['', '-ink']){
   const file=path.join(sheets,(phase==='recognition'?'01-recognition':'02-assembly')+suffix+'.svg');let svg=fs.readFileSync(file,'utf8');
   for(const [name,d]of Object.entries(details)){
    svg=svg.replace(new RegExp('(<path id="d-'+name+'" d=")[^"]*'),(_,start)=>start+d);
    svg=svg.replace(new RegExp('<clipPath id="ring-clip-'+name+'"[\\s\\S]*?</clipPath>','g'),'');
    svg=svg.replace('</defs>',`<clipPath id="ring-clip-${name}" clipPathUnits="userSpaceOnUse"><use xlink:href="#p-${name}"/></clipPath></defs>`);
    const lox=policy.tanks[name].surfaceType==='LOX',fill=lox?'#9db9c32e':'#8b976a38',stroke=lox?'#c5e0e9':'#aebf9c';
    svg=svg.replace(new RegExp('<use xlink:href="#p-'+name+'" class="part"[^>]*?/>','g'),`<use xlink:href="#p-${name}" class="part" style="fill:${fill};stroke:${stroke}"/>`);
    svg=svg.replace(new RegExp('<use xlink:href="#d-'+name+'"[^>]*?/>','g'),`<use xlink:href="#d-${name}" clip-path="url(#ring-clip-${name})" fill="none" stroke="${stroke}" stroke-opacity=".72" stroke-width="1.15" data-ring-count="${policy.tanks[name].ringCentres.length}"/>`);
   }
   fs.writeFileSync(file,svg);
  }
 }
 fs.writeFileSync(path.join(sheets,'tank-details.json'),JSON.stringify(report,null,2));console.log('Updated both blueprint sheets: LOX/fuel coding and 10/7/4/2 metric ring layouts');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
