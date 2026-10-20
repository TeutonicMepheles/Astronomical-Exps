/* Minimal front-facing optical workspace: grid, optical axis and emitter. */
(function(N){
  'use strict';const T=window.THREE;
  N.Darkroom=class{
    constructor(lab){
      this.lab=lab;this.view=lab.view;this.group=new T.Group();lab.group.add(this.group);
      this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.drag=null;
      this.group.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-3.5,0,-.1),new T.Vector3(8,0,-.1)]),new T.LineBasicMaterial({color:0x86a7cf,transparent:true,opacity:.55})));
      for(let x=-3.5;x<=7;x+=.25)this.view.rod([x,0,-.1],[x,Number.isInteger(x)?-.1:-.045,-.1],.005,new T.MeshBasicMaterial({color:0x789cc9}),this.group);
      for(let x=-3;x<=6;x++)this.label(String(x*30),new T.Vector3(x,-.24,0),.27);
      this.label('主光轴 / cm',new T.Vector3(6.4,-.48,0),.3);
      this.emitter=new T.Group();this.group.add(this.emitter);

      this.art=new N.OpticalArt(this);
    }
    box(size,position,material,parent=this.group){const o=new T.Mesh(new T.BoxGeometry(...size),material);o.position.set(...position);parent.add(o);return o;}
    label(text,position,height,parent=this.group){const c=document.createElement('canvas');c.width=384;c.height=64;const ctx=c.getContext('2d');ctx.font='28px Microsoft YaHei, sans-serif';ctx.textAlign='center';ctx.fillStyle='#9fbbdf';ctx.fillText(text,192,43);const texture=new T.CanvasTexture(c),sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(height*6,height,1);sprite.position.copy(position);parent.add(sprite);}
    project(position){const p=this.lab.group.localToWorld(position.clone()).project(this.view.camera),rect=this.view.container.getBoundingClientRect();return{x:rect.left+(p.x*.5+.5)*rect.width,y:rect.top+(-p.y*.5+.5)*rect.height};}
    positionFromEvent(e){const rect=this.view.container.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.view.camera);const p=new T.Vector3();this.raycaster.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),0),p);return p.x;}
    beginDrag(e){
      const target=e.target.closest('.clamp-arrow,#rail-carriage');
      if(N.course.get().stage!=='mirrors'||!target||e.button!==0||!e.isPrimary||this.drag)return false;
      this.drag={target,pointerId:e.pointerId,startX:e.clientX,active:false,offset:N.course.get().mirrorPosition-this.positionFromEvent(e)};
      target.focus({preventScroll:true});return true;
    }
    moveDrag(e){
      const drag=this.drag;if(!drag||drag.pointerId!==e.pointerId)return;
      if(!drag.active&&Math.abs(e.clientX-drag.startX)<=4)return;
      drag.active=true;this.view.container.classList.add('is-dragging-mirror');
      N.course.setMirrorPosition(this.positionFromEvent(e)+drag.offset);
    }
    endDrag(e){
      const drag=this.drag;if(!drag||e&&drag.pointerId!==e.pointerId)return false;
      this.drag=null;this.view.container.classList.remove('is-dragging-mirror');
      if(drag.target.hasPointerCapture(drag.pointerId))drag.target.releasePointerCapture(drag.pointerId);return true;
    }
    sync(s){if(s.stage!=='mirrors')this.endDrag();this.emitter.position.x=s.mirrorSource;}
    placeLabels(){const s=N.course.get();this.art.place(s);const p=this.project(new T.Vector3(s.mirrorPosition+(s.mirrorMounted?2.15:0),s.mirrorMounted?1.2:1,0)),rect=this.view.container.getBoundingClientRect(),el=document.querySelector('#mirror-drop-slot');el.style.left=(p.x-rect.left)/rect.width*this.view.container.clientWidth+'px';el.style.top=(p.y-rect.top)/rect.height*this.view.container.clientHeight+'px';}
  };
})(window.Newton);
