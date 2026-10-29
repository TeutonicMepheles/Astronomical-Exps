/* Presentation-only advertisement controls; independent of authoring UI. */
window.LightPollution.createBillboardPanel=function({getObject,locked,commands,getResource,select}){
 const $=id=>document.getElementById(id);
 function closeBillboard(){LightPollution.panels.close('billboard');}
 function syncBillboard(){const panel=$('billboard-controls'),o=getObject();if(!panel||!o)return;
  for(const k of ['brightness','bloom','glitch','dots']){const input=$('billboard-'+k);input.value=o[k];input.disabled=locked(o);$('billboard-'+k+'-value').textContent=o[k]+'%';}
  $('billboard-resource').value=getResource();$('billboard-resource').disabled=locked(o);$('billboard-play').textContent=o.playing?'暂停播放':'继续播放';for(const id of ['billboard-play','billboard-next'])$(id).disabled=locked(o);
 }
 function openBillboard(){LightPollution.panels.open('billboard');}
 function bindBillboard(){const panel=document.createElement('aside');panel.id='billboard-controls';panel.hidden=true;panel.setAttribute('aria-label','广告屏编辑');panel.innerHTML=`<div class="building-heading"><strong>广告屏编辑</strong><button id="billboard-close" aria-label="关闭广告屏编辑">×</button></div>${[['brightness','亮度',200],['bloom','Bloom 光晕',100],['glitch','Glitch 故障',100],['dots','像素波点',100]].map(([k,label,max])=>`<label>${label}<output id="billboard-${k}-value"></output><input id="billboard-${k}" type="range" min="0" max="${max}" step="5"></label>`).join('')}<label>视频资源<select id="billboard-resource"><option value="08">08 · 音乐之夜</option><option value="03">03 · 未来视界</option></select></label><div class="building-presets"><button id="billboard-play">暂停播放</button><button id="billboard-next">从头播放</button></div><p>灯光与光晕为视觉演示。</p>`;document.querySelector('.stage').append(panel);
  LightPollution.panels.register('billboard',()=>{select();panel.hidden=false;},()=>{commands.commitGesture();panel.hidden=true;});$('billboard-close').onclick=closeBillboard;
  for(const k of ['brightness','bloom','glitch','dots']){const input=$('billboard-'+k);let dragging=false;
   // Chrome can emit the track's first input before blurring the previous slider.
   // Focus first so that previous blur cannot commit this new gesture halfway.
   input.onpointerdown=()=>{input.focus({preventScroll:true});dragging=true;};input.oninput=e=>commands.previewValue(k,Number(e.target.value));
   input.onchange=()=>{if(!dragging)commands.commitGesture();};input.onpointerup=()=>{dragging=false;commands.commitGesture();};
   input.onblur=()=>{dragging=false;commands.commitGesture();};input.onpointercancel=()=>{dragging=false;commands.cancelGesture();};
  }
  LightPollution.on(document,'keydown',e=>{if(e.key==='Escape'&&!panel.hidden)commands.cancelGesture();},true);
  $('billboard-resource').onchange=e=>commands.setResource(e.target.value);
  $('billboard-play').onclick=commands.toggle;$('billboard-next').onclick=commands.next;

  for(const id of ['edit-toggle','lamp-toggle','sky-toggle'])LightPollution.on($(id),'click',closeBillboard);
  LightPollution.on(document,'keydown',e=>{if(e.key==='Escape')closeBillboard();});syncBillboard();
 }
 bindBillboard();return {open:openBillboard,sync:syncBillboard,syncResource(){if(!$('billboard-controls').hidden)$('billboard-resource').value=getResource();}};
};
