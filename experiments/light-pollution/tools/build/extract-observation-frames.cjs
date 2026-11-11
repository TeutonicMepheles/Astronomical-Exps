/* Extract the first four seconds of the observation video into 20 fps WebP atlases. */
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const input=path.join(root,'assets/observation-tree-light-v2.mp4');
const output=path.join(root,'assets/observation-tree-light-v2-frames');
const fps=20,durationSeconds=4,frameWidth=768,frameHeight=432,columns=5,rows=4;

function saveDataUrl(file,dataUrl){
 const encoded=dataUrl.slice(dataUrl.indexOf(',')+1);
 fs.writeFileSync(file,Buffer.from(encoded,'base64'));
}

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  const source='data:video/mp4;base64,'+fs.readFileSync(input).toString('base64');
  await page.setContent(`<video muted playsinline preload="auto" src="${source}"></video>`);
  await page.locator('video').waitFor();
  const duration=await page.locator('video').evaluate(video=>new Promise((resolve,reject)=>{
   if(video.readyState>=1)return resolve(video.duration);
   video.addEventListener('loadedmetadata',()=>resolve(video.duration),{once:true});
   video.addEventListener('error',()=>reject(video.error||Error('Video metadata failed')),{once:true});
  }));
  if(duration<durationSeconds)throw Error(`Video is only ${duration}s; ${durationSeconds}s required.`);

  async function extract(name,startFrame,count,sheetColumns,sheetRows){
   const dataUrl=await page.locator('video').evaluate(async(video,settings)=>{
    video.pause();video.muted=true;
    const canvas=document.createElement('canvas');
    canvas.width=settings.frameWidth*settings.columns;
    canvas.height=settings.frameHeight*settings.rows;
    const context=canvas.getContext('2d',{alpha:false});
    async function seek(time){
     if(Math.abs(video.currentTime-time)>.0005){
      await new Promise((resolve,reject)=>{
       const done=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(video.error||Error('Seek failed'));};
       const cleanup=()=>{video.removeEventListener('seeked',done);video.removeEventListener('error',failed);};
       video.addEventListener('seeked',done,{once:true});video.addEventListener('error',failed,{once:true});video.currentTime=time;
      });
     }
     await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    }
    for(let local=0;local<settings.count;local++){
     const frame=settings.startFrame+local;
     await seek(Math.min(frame/settings.fps,settings.durationSeconds));
     const x=(local%settings.columns)*settings.frameWidth,y=Math.floor(local/settings.columns)*settings.frameHeight;
     context.drawImage(video,x,y,settings.frameWidth,settings.frameHeight);
    }
    return canvas.toDataURL('image/webp',.92);
   },{startFrame,count,columns:sheetColumns,rows:sheetRows,frameWidth,frameHeight,fps,durationSeconds});
   saveDataUrl(path.join(output,name),dataUrl);
  }

  for(let second=0;second<durationSeconds;second++)await extract(`atlas-${String(second).padStart(2,'0')}.webp`,second*fps,fps,columns,rows);
  await extract('atlas-04-final.webp',durationSeconds*fps,1,1,1);
  const metadata={version:1,fps,durationSeconds,totalFrames:durationSeconds*fps+1,frameWidth,frameHeight,columns,rows,sheets:[
   ...Array.from({length:durationSeconds},(_,index)=>({src:`atlas-${String(index).padStart(2,'0')}.webp`,firstFrame:index*fps,count:fps,columns,rows})),
   {src:'atlas-04-final.webp',firstFrame:durationSeconds*fps,count:1,columns:1,rows:1}
  ]};
  fs.writeFileSync(path.join(output,'frames.json'),JSON.stringify(metadata,null,2)+'\n');
  console.log(`Extracted ${metadata.totalFrames} states at ${fps} fps through ${durationSeconds.toFixed(2)}s.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
