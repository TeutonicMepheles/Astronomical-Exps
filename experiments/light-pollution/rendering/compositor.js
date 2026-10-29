window.LightPollution.renderScene=function({lightEnvironment,scene,session,specs,visible,bounds,candidate,candidateMode,surfaces,objects,waterFlow,waterReduced,waterSeconds,reflectionScene,screenLight,sceneEffects,lamps,paint,cover,W,H}){lightEnvironment.update();const c=scene.getContext('2d');c.clearRect(0,0,W,H);
  LightPollution.renderReflections(arguments[0]);
  for(const layer of session.layers){
   const group=specs.find(s=>s[0]===layer.id)[2];
   if(!layer.visible||!(layer.id==='buildings'?(visible[2]||visible[3]):visible[group]))continue;
   const b=bounds[layer.id];c.save();c.globalAlpha=layer.opacity;c.translate(b.x+layer.x,b.y+layer.y);c.scale(layer.scale,layer.scale);c.translate(-b.x,-b.y);

   if(layer.id===(candidate?'environment':'mountains'))lightEnvironment.drawRidge(c,surfaces[layer.id]);
   const replacement=objects?.getLayerImage(layer.id);const flowing=layer.id==='front-water'?waterFlow.render(replacement||surfaces[layer.id],b,waterReduced.matches?0:waterSeconds,!!replacement,reflectionScene,{x:b.x+layer.x,y:b.y+layer.y,w:b.w*layer.scale,h:b.h*layer.scale}):null;if(flowing)c.drawImage(flowing,b.x,b.y,b.w,b.h);else if(layer.id===(candidateMode?'environment':'distant')){const lit=sceneEffects.render(replacement||surfaces[layer.id]);if(replacement)cover(c,lit,{x:0,y:0,w:lit.width,h:lit.height},b);else c.drawImage(lit,0,0);}else if(replacement)cover(c,replacement,{x:0,y:0,w:replacement.width,h:replacement.height},b);else if(candidate&&objects&&['residential','public','ad-building'].includes(layer.id))objects.renderBuildingBase(c,layer.id,surfaces[layer.id]);else c.drawImage(surfaces[layer.id],0,0);
   if(candidate){objects?.render(c,'window',layer.id);objects?.render(c,'billboard',layer.id);}else{if(layer.id==='buildings'&&visible[2])objects?.render(c,'window');if(layer.id==='buildings'&&visible[3])objects?.render(c,'billboard');}c.restore();
  }lamps.render(c);paint();
 }
