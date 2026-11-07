import { mountBrushFlow } from './brush-flow.js';
export function mountBackdrop(stage) {
  const layer=document.createElement('div');layer.className='reference-backdrop';layer.setAttribute('aria-hidden','true');
  layer.innerHTML='<div class="nebula-breath"></div>';
  const stars=[[.099,.043],[.172,.057],[.30,.15],[.125,.354],[.634,.284],[.94,.312],[.24,.348],[.331,.666],[.193,.591],[.086,.705],[.884,.808],[.91,.927]];
  stars.forEach(([x,y],i)=>{const star=document.createElement('i');star.style.left=x*100+'%';star.style.top=y*100+'%';star.style.animationDuration=(4.7+i%5*1.3)+'s';star.style.animationDelay=(-i*1.71)+'s';layer.append(star);});
  if(new URLSearchParams(location.search).get('motion')==='off')layer.classList.add('static-backdrop');
  stage.prepend(layer);
  mountBrushFlow(layer);
}
