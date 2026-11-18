const LEVELS=['低','中','高'];
/** Display-only diagram; conditions are selected using the page buttons. */
export class LaunchForceDiagram{
 constructor({arrows,getState,placeControls}){Object.assign(this,{arrows,getState,placeControls});}
 measure(){const s=this.getState();return{up:s.thrust*105,self:s.mass*52.5,load:s.load*52.5,total:(s.mass+s.load)*52.5,upBase:350,downBase:370,x:780,partsX:780,totalX:665};}
 draw(c){const s=this.getState(),g=this.measure();c.save();const up=this.arrows.draw(c,{id:'launch-thrust',x:g.x,y:g.upBase,angle:-Math.PI/2,maxLength:315,strength:s.thrust/3,height:48});const self=this.arrows.draw(c,{id:'launch-self-weight',x:g.partsX,y:g.downBase,angle:Math.PI/2,maxLength:157.5,strength:s.mass/3,height:30,color:'#edb27b'});const load=this.arrows.draw(c,{id:'launch-payload-weight',x:g.partsX,y:g.downBase+self.length,angle:Math.PI/2,maxLength:157.5,strength:s.load/3,height:30,color:'#b8a6d9'});const total=this.arrows.draw(c,{id:'launch-weight',x:g.totalX,y:g.downBase,angle:Math.PI/2,maxLength:315,strength:(s.mass+s.load)/6,height:48,color:'#d8b074'});
  c.font='20px "Alibaba PuHuiTi 3",sans-serif';c.textAlign='center';c.fillStyle='#d8b074';c.save();c.translate(g.totalX-30,g.downBase+total.length/2);c.rotate(-Math.PI/2);c.fillText('总重力',0,0);c.restore();c.restore();this.geometry={...g,up:up.length,self:self.length,load:load.length,total:total.length};this.placeControls?.(this.geometry);
 }
}
