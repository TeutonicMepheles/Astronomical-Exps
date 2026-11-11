const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});await page.goto(pathToFileURL(path.join(root,'assets/panorama-20261111/editor.html')).href);await page.waitForSelector('html[data-ready=true]',{timeout:60000});
 const result=await page.evaluate(async()=>{
  const candidate=await loadPanoramaScene(2172,543),expected=[[2,7,10],[1,4,8],[3,6,11],[5,9]],reports=[];let preview;
  const visible=p=>p.x<2172&&p.x+p.width>0&&p.y<543&&p.y+p.height>0;
  for(let session=0;session<3;session++){
   const renderer=createPanoramaTrafficRenderer(candidate);try{const initial=renderer.poses(0),factors=[...new Map(initial.map(p=>[p.lane,p.laneSpeed])).values()];
    if(Math.max(...factors)-Math.min(...factors)<.12)throw Error('Lane speed variation missing');
    let minimumNormalizedGap=Infinity,wraps=0,pairs=0;let previous=null;
    // The cyclic log-depth headway is invariant; validate it for every following pair.
    for(let lane=0;lane<4;lane++){const cars=initial.filter(p=>p.lane===lane).sort((a,b)=>a.depth-b.depth),members=cars.map(p=>Number(p.id.split('-')[1])).sort((a,b)=>a-b);if(JSON.stringify(members)!==JSON.stringify(expected[lane]))throw Error('Wrong lane membership');
     for(let i=0;i<cars.length;i++){const near=cars[i],far=cars[(i+cars.length-1)%cars.length],period=Math.log(near.laneMax/near.laneMin),gap=(Math.log(near.depth/far.depth)+period)%period,clearance=400-near.height/near.depth-400*Math.exp(-gap);if(clearance<10)throw Error('Unsafe cyclic headway');}
    }
    // One hour of motion phase, including hundreds of cycles, without waiting an hour.
    const stride=session===2?.3:.1;for(let step=0;step<=Math.round(3600/stride);step++){const time=step*stride,poses=renderer.poses(time);
     if(poses.some(p=>![p.x,p.y,p.depth,p.width,p.height].every(Number.isFinite)||p.laneSpeed<.888-1e-9||p.laneSpeed>1.112+1e-9))throw Error('Invalid pose/speed');
     for(let lane=0;lane<4;lane++){const cars=poses.filter(p=>p.lane===lane);if(cars.some(p=>p.laneSpeed!==cars[0].laneSpeed))throw Error('Same-lane cars have different speeds');const shown=cars.filter(visible).sort((a,b)=>(a.y+a.height)-(b.y+b.height));
      for(let i=1;i<shown.length;i++){const near=shown[i],far=shown[i-1],gap=(near.y-far.y-far.height)/near.depth;minimumNormalizedGap=Math.min(minimumNormalizedGap,gap);pairs++;if(gap<10-1e-7)throw Error('Same-lane bodies overlap');}
     }
     if(previous)for(let i=0;i<poses.length;i++){const p=poses[i],old=previous[i];if(Math.abs(p.laneSpeed-old.laneSpeed)>.0021*stride+1e-9)throw Error('Speed jitter');if(Math.abs(Math.log(p.depth/old.depth))>.05){wraps++;if(visible(p)||visible(old))throw Error('Visible loop teleport');}}
     previous=poses;
    }
    if(session===0){const sheet=Object.assign(document.createElement('canvas'),{width:1484,height:616}),sg=sheet.getContext('2d');for(const [index,time] of [0,8,16,24].entries()){const frame=Object.assign(document.createElement('canvas'),{width:2172,height:543}),g=frame.getContext('2d');g.fillStyle='#333d4b';g.fillRect(0,0,2172,543);const carIds=renderer.poses(time).sort((a,b)=>a.depth-b.depth).map(p=>p.id);let cursor=0;for(const [original] of candidate.specs){const id=renderer.handles(original)?carIds[cursor++]:original;if(renderer.handles(id))renderer.draw(g,id,time,0);else g.drawImage(candidate.surfaces[id],0,0);}sg.drawImage(frame,1430,235,742,308,index%2*742,Math.floor(index/2)*308,742,308);sg.fillStyle='#fff';sg.font='18px sans-serif';sg.fillText(time+'s',index%2*742+10,Math.floor(index/2)*308+24);}preview=sheet.toDataURL();}
    reports.push({session,factors,minimumNormalizedGap,wraps,visiblePairs:pairs,phaseSeconds:3600,stepSeconds:stride});
   }finally{renderer.destroy()}
  }return {reports,preview};
 });
 const proof=result.reports;fs.writeFileSync(path.join(root,'docs/lane-traffic-preview-20261111.png'),Buffer.from(result.preview.split(',')[1],'base64'));assert.equal(proof.length,3);assert(proof.every(p=>p.wraps>100&&p.minimumNormalizedGap>=10));fs.writeFileSync(path.join(root,'docs/lane-traffic-20261111.json'),JSON.stringify(proof,null,2));console.log('PASS randomized lane speeds, smooth drift, analytic cyclic headway, three random sessions x one simulated hour, no same-lane overlap or visible loop teleport',proof);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
