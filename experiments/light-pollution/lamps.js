/* All near-side street/path lamps; building and distant city lights are a fixed baseline. */
(() => {
  const W=2172,H=724, ns='http://www.w3.org/2000/svg';
  const base='L316 774H329V786H339V805H334V934H350V945H360V972H241V945H253V934H267V805H261V786H274V774H285V245';
  const open='M285 245L269 239L266 226C232 212 211 181 211 141C211 92 251 54 300 54C350 54 391 92 391 141C391 181 366 212 339 226L331 239L316 245'+base+'Z';
  // Native SVG clipping also suppresses the unwanted halo in the generated sprite sheet.
  const half='M752 245L738 239L733 224C706 213 697 187 697 165L664 156C668 106 701 71 746 63V54H790V63C835 71 869 105 873 156L840 165C835 191 829 215 803 224L798 239L784 245L784 774H797V786H808V805H803V934H819V945H828V972H709V945H721V934H735V805H728V786H741V774H752Z';
  const full='M1172 774V151H1171V87Q1188 80 1205 87V105H1290V100Q1372 82 1454 101V147Q1372 179 1290 149V128H1205V151H1202V774H1215V786H1228V805H1221V934H1237V945H1249V972H1129V945H1141V934H1155V805H1148V786H1161V774Z';
  const types={
    open:{origin:180,pole:300,path:open,light:[300,140],spill:1,ground:.44,diffuser:'M207 141a94 92 0 1 0 188 0a94 92 0 1 0 -188 0'},
    half:{origin:648,pole:768,path:half,light:[768,182],spill:.46,ground:.69,diffuser:'M696 153Q768 145 840 153Q835 224 768 225Q701 222 696 153Z'},
    full:{origin:1068,pole:1188,path:full,light:[1372,148],spill:.08,ground:.87,diffuser:'M1290 146C1290 128 1455 128 1455 146C1455 168 1290 168 1290 146Z'}
  };
  const state={shade:'half',temperature:3000,brightness:100,selected:null};
  const panel=document.querySelector('.lamp-editor'),root=document.querySelector('.lamps'),stage=document.querySelector('.stage');
  const light=document.querySelector('.lighting').getContext('2d');
  const entries=window.ForegroundLamps.map((data,i)=>{
    const button=document.createElement('button');button.className='lamp-object';button.setAttribute('aria-label',`编辑前景${data.kind} ${i+1}`);button.setAttribute('aria-expanded','false');button.dataset.lamp=data.id;root.append(button);
    return {...data,button,hover:false,hint:null};
  });
  document.querySelector('.lamp-count').textContent=`${entries.length} 盏联动`;
  const power=e=>Math.max(.1,(e.height/155)**2);
  function rgb(){const t=(state.temperature-2200)/4300;return [Math.round(255-70*t),Math.round(179+35*t),Math.round(100+155*t)];}
  function glow(ctx,x,y,rx,ry,color,opacity){ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${color},${opacity})`);g.addColorStop(.4,`rgba(${color},${opacity*.4})`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();}
  function lighting(){
    const gain=state.brightness/100,config=types[state.shade],color=rgb().join(',');
    window.SkyScene.update('lamps',entries.map(e=>({x:e.x,radius:470,strength:.22*config.spill*power(e)*gain,color:rgb()})));
    light.clearRect(0,0,W,H);
    entries.forEach(e=>{
      const unit=e.height/1000,size=e.height/155;const lx=e.x+(config.light[0]-config.pole)*unit,ly=e.y+(config.light[1]-972)*unit;
      // Ground is restricted to the promenade; reflections are restricted to foreground water.
      light.save();light.beginPath();light.rect(0,578,W,30);light.clip();glow(light,lx,e.y+3,(state.shade==='open'?106:74)*size,19*size,color,config.ground*gain);light.restore();
      light.save();light.beginPath();light.rect(0,632,W,92);light.clip();
      for(let n=0;n<9;n++){light.fillStyle=`rgba(${color},${(.26-n*.018)*config.ground*size*gain})`;const width=(36-n*2+(n%3)*5)*size;light.fillRect(lx-width/2+(n%2)*4,636+n*8,width,2+n%2);}
      light.restore();
      const halo=(state.shade==='open'?62:state.shade==='half'?33:13)*size;
      glow(light,lx,ly,halo,halo,color,(state.shade==='open'?.5:.24)*gain);
      if(state.shade!=='open'){
        light.save();const beam=light.createLinearGradient(lx,ly,lx,e.y);beam.addColorStop(0,`rgba(${color},${.15*gain})`);beam.addColorStop(1,`rgba(${color},0)`);light.fillStyle=beam;light.beginPath();light.moveTo(lx-5*size,ly);light.lineTo(lx-62*size,e.y);light.quadraticCurveTo(lx,e.y+7*size,lx+62*size,e.y);light.lineTo(lx+5*size,ly);light.fill();light.restore();
      }
    });
    const lens=rgb().map((channel,i)=>Math.round([42,52,70][i]*(1-gain)+channel*gain));
    entries.forEach(e=>e.button.querySelector('.diffuser').setAttribute('fill',`rgb(${lens.join(',')})`));
  }
  function build(){const t=types[state.shade];entries.forEach((e,i)=>{
    e.hint?.destroy();const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`${t.origin} 0 400 1000`);svg.setAttribute('aria-hidden','true');
    svg.innerHTML=`<defs><clipPath id="lamp-clip-${i}"><path d="${t.path}"/></clipPath></defs><g clip-path="url(#lamp-clip-${i})"><image href="assets/lamp-sprites.png" width="1536" height="1024"/><path class="diffuser" d="${t.diffuser}" fill="#ffe1a4" opacity="1"/></g>`;
    const unit=e.height/1000;
    e.button.replaceChildren(svg);e.button.style.left=`${(e.x-(t.pole-t.origin)*unit)/W*100}%`;e.button.style.top=`${(e.y-972*unit)/H*100}%`;e.button.style.width=`${400*unit/W*100}%`;e.button.style.height=`${e.height/H*100}%`;
    e.hint=new ExperimentHints.AffordanceHint(svg,{contour:{viewBox:`${t.origin} 0 400 1000`,path:t.path},overlayRoot:e.button});
  });updateHints();lighting();}
  function updateHints(){entries.forEach(e=>{const selected=state.selected!==null;e.hint.layer.style.setProperty('--hint-outline',selected?'#F4CB83':'#C4E3F1');e.hint.layer.style.setProperty('--hint-outline-width',selected?'3px':'2px');e.hint.layer.style.animation=selected?'none':'';e.hint.layer.style.opacity=selected?'1':'';e.hint.setEnabled(selected||e.hover||document.activeElement===e.button);e.button.setAttribute('aria-expanded',String(state.selected===e.id));});}
  function close(returnFocus=false){const old=entries.find(e=>e.id===state.selected);state.selected=null;panel.hidden=true;updateHints();if(returnFocus)old?.button.focus({preventScroll:true});}
  function positionPanel(){if(!state.selected)return;const e=entries.find(e=>e.id===state.selected),r=e.button.getBoundingClientRect(),s=stage.getBoundingClientRect();if(r.right<s.left||r.left>s.right){close();return;}const pw=panel.offsetWidth,ph=panel.offsetHeight;let x=r.left-s.left-pw-14;if(x<12)x=r.right-s.left+14;panel.style.left=`${Math.max(12,Math.min(s.width-pw-12,x))}px`;panel.style.top=`${Math.max(12,Math.min(s.height-ph-16,r.top-s.top-35))}px`;}
  function select(id){state.selected=id;panel.hidden=false;updateHints();positionPanel();stage.dispatchEvent(new Event('lamp-selected'));}
  entries.forEach(e=>{e.button.addEventListener('pointerenter',()=>{e.hover=true;updateHints();});e.button.addEventListener('pointerleave',()=>{e.hover=false;updateHints();});e.button.addEventListener('focus',updateHints);e.button.addEventListener('blur',updateHints);e.button.addEventListener('click',event=>{if(event.detail===0)select(e.id);});});
  document.querySelectorAll('[data-shade]').forEach(button=>button.addEventListener('click',()=>{state.shade=button.dataset.shade;document.querySelectorAll('[data-shade]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));build();positionPanel();}));
  document.querySelector('#temperature').addEventListener('input',event=>{state.temperature=Number(event.target.value);document.querySelector('#temperature-value').value=`${state.temperature} K`;lighting();});
  document.querySelector('#lamp-brightness').addEventListener('input',event=>{state.brightness=Number(event.target.value);document.querySelector('#lamp-brightness-value').value=`${state.brightness}%`;lighting();});
  document.querySelector('.close-editor').addEventListener('click',()=>close(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close(true);});
  window.LampScene={select,close,positionPanel};
  build();
})();

