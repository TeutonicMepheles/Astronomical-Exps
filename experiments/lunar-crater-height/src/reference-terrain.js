/* Upper-surface samples of the user-supplied GLB. Material is owned by crater-3d.js. */
(() => {
  'use strict';
  const data=window.LunarReferenceTerrainData;
  if(!data)throw new Error('Missing local reference terrain asset');
  const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
  const heights=new Float32Array(decode(data.heights).buffer),mask=decode(data.mask);
  const {segments,size}=data.metadata,n=segments+1;
  function cell(x,z){
    const gx=Math.max(0,Math.min(segments,(x+size/2)*segments/size));
    const gz=Math.max(0,Math.min(segments,(z+size/2)*segments/size));
    const ix=Math.min(segments-1,Math.floor(gx)),iz=Math.min(segments-1,Math.floor(gz));
    return {i:iz*n+ix,u:gx-ix,v:gz-iz};
  }
  function heightAt(x,z){
    const {i,u,v}=cell(x,z),a=heights[i],b=heights[i+1],c=heights[i+n],d=heights[i+n+1];
    // Same diagonal as THREE.PlaneGeometry: no bilinear-vs-triangle discrepancy.
    return u+v<=1 ? a+(b-a)*u+(c-a)*v : d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  function contains(x,z){
    if(Math.abs(x)>size/2||Math.abs(z)>size/2)return false;
    const {i}=cell(x,z);
    return !!(mask[i]&&mask[i+1]&&mask[i+n]&&mask[i+n+1]);
  }
  window.LunarReferenceTerrain=Object.freeze({heightAt,contains,segments,size,metadata:data.metadata});
  delete window.LunarReferenceTerrainData;
})();
