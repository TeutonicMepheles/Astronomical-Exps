// One metric scale for all five loose modules and all ten internal inspection pieces.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),A=path.join(root,'assets/blueprint-flat');
const c=JSON.parse(fs.readFileSync(path.join(root,'selection-contours.js'),'utf8').split('export const selectionContours=')[1].trim().replace(/;$/,''));
const top=[['Boosters'],['Fairing'],['Payload'],['Stage2'],['Stage1']],bottom=[['Stage1LOXTank'],['Stage1FuelTank'],['Stage1Engine01','Stage1Engine02'],['Stage2LOXTank'],['Stage2FuelTank'],['Stage2Engine01','Stage2Engine02','Stage2Engine03','Stage2Engine04']];
const size=n=>({w:c.entries[n].crop.width-24,h:c.entries[n].crop.height-24}),gap=18;
const groupSize=names=>{if(names.length===1)return size(names[0]);const cols=2,rows=names.length/2,w=Math.max(...names.map(n=>size(n).w)),h=Math.max(...names.map(n=>size(n).h));return {w:cols*w+gap,h:rows*h+(rows-1)*gap};};
let fit=Math.min(...top.map(g=>180/groupSize(g).h));
while(top.reduce((sum,g)=>sum+Math.max(210,groupSize(g).w*fit),0)+4*24>1840)fit*=.995;
const data=JSON.parse(fs.readFileSync(path.join(A,'hotspots.json'))),transforms={},regions=[],groups=[];
const canonical=n=>n.replace(/Engine0[2-4]$/,'Engine01');
function row(items,centreY,labelY,minWidth,between){
 const widths=items.map(names=>Math.max(minWidth,groupSize(names).w*fit)),total=widths.reduce((a,b)=>a+b,0)+(items.length-1)*between;let left=(1920-total)/2;
 for(let g=0;g<items.length;g++){
  const names=items[g],width=widths[g],cx=left+width/2,dimensions=groupSize(names),cols=names.length===1?1:2,rows=Math.ceil(names.length/cols),cellW=Math.max(...names.map(n=>size(n).w)),cellH=Math.max(...names.map(n=>size(n).h));
  names.forEach((name,i)=>{
   const s=size(name),x=cols===1?cx:cx+((i%cols)-.5)*(cellW+gap)*fit,y=centreY+(Math.floor(i/cols)-(rows-1)/2)*(cellH+gap)*fit;
   const tx=x-(12+s.w/2)*fit,ty=y-(12+s.h/2)*fit;transforms[name]={scale:fit,tx,ty};
   regions.push({node:canonical(name),rect:[x-s.w*fit/2,y-s.h*fit/2,s.w*fit,s.h*fit].map(n=>Number(n.toFixed(3))),labelRect:i===0?[cx-minWidth/2,labelY,minWidth,36]:null});
   groups.push(`<g transform="translate(${tx} ${ty}) scale(${fit})"><use xlink:href="#p-${name}" class="part"/><use xlink:href="#d-${name}" fill="none" stroke="#9ac5db" stroke-opacity=".43" stroke-width=".65"/></g>`);
  });left+=width+between;
 }
}
row(top,205,320,210,24);row(bottom,900,975,260,20);
const names=[...top.flat(),...bottom.flat()],defs=names.map(n=>`<path id="p-${n}" d="${c.entries[n].path}"/><path id="d-${n}" d=""/>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>${defs}</defs><style>.part{fill:#b5dbec08;stroke:#c2e3f1;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}</style>${groups.join('')}</svg>`;
for(const suffix of ['', '-ink'])fs.writeFileSync(path.join(A,'02-assembly'+suffix+'.svg'),svg);
data.assembly=regions;data.assemblyLayout={pixelsPerModelUnit:c.height/c.span*c.layoutScale*fit,sourceContourFit:fit,transforms,sharedScale:true,horizontalRows:true};
fs.writeFileSync(path.join(A,'hotspots.json'),JSON.stringify(data,null,2));console.log('Uniform assembly sheet:',names.length,'pieces, shared source fit',fit,'pixels/model unit',data.assemblyLayout.pixelsPerModelUnit);
