/* App-owned HUD; star counts come from the starfield's actual draw pass. */
LightPollution.createExperimentStatus=function({canvas,W,H,sky,getGeometry,getSources,getOcclusion,allLights}){
 const stage=document.querySelector('.stage'),skyCanvas=document.querySelector('#sky-background'),root=document.createElement('section');root.className='sky-readout';root.setAttribute('aria-label','光污染与星空演示');root.innerHTML='<strong class="bortle-reading"></strong><span class="visible-stars" aria-label="当前画面实际绘制星数"></span>';stage.append(root);
 let geometry='',sources=[],mask=null,frame=null,last='';
 function viewport(){const s=stage.getBoundingClientRect(),c=canvas.getBoundingClientRect(),b=skyCanvas.getBoundingClientRect();frame={s,c,b};sky.refresh();}
 sky.setVisibleStarTest((x,y)=>{if(!frame||!mask)return false;const {s,c,b}=frame,px=b.x+x/1600*b.width,py=b.y+y/900*b.height;if(px<Math.max(0,s.x)||px>Math.min(innerWidth,s.right)||py<Math.max(0,s.y)||py>Math.min(innerHeight,s.bottom))return false;const sx=Math.floor((px-c.x)/c.width*W),sy=Math.floor((py-c.y)/c.height*H);return sx>=0&&sx<W&&sy>=0&&sy<H&&mask[(sy*W+sx)*4+3]<245;});
 function display(){const s=sky.getVisibilityStats(),grade=Math.max(1,Math.min(9,Math.round(1+8*s.pollution))),key=grade+':'+s.count;if(key===last)return;last=key;root.querySelector('.bortle-reading').textContent='波特尔 '+grade+' 级（演示）';root.querySelector('.visible-stars').textContent='可见星 '+s.count+' 颗';}
 function sync(){const key=JSON.stringify(getGeometry()),next=getSources();if(key!==geometry||next.some((v,i)=>v!==sources[i])){geometry=key;sources=next;mask=getOcclusion();viewport();}}
 LightPollution.on(canvas,'streetnavigationchange',viewport);LightPollution.on(skyCanvas,'starfielddraw',display);const resize=new ResizeObserver(viewport);resize.observe(stage);LightPollution.disposers.push(()=>{resize.disconnect();sky.setVisibleStarTest(null);root.remove();});viewport();display();return {sync,lightAll:allLights};
};
