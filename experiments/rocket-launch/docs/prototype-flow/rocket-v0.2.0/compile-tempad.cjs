const fs=require('fs'),path=require('path');
const dir=__dirname;
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'../rocket-v0.1.3/build-manifest.json'),'utf8'));
const baseline=JSON.parse(fs.readFileSync(path.join(dir,'tempad-current.json'),'utf8')).flatMap(b=>b.roots||b.results?.flatMap(r=>r.result?.roots||[])||[]);
const spec=JSON.parse(fs.readFileSync(path.join(dir,'../rocket-v0.1.3/spec.json'),'utf8'));
const store=new Map();let seq=0;
function node(type,id){let n={type,id:id||'visual-'+(++seq),name:'',x:0,y:0,width:10,height:10,children:[],reactions:[],appendChild(c){this.children.push(c);c.parent=this;},resize(w,h){this.width=w;this.height=h;},remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);},async setReactionsAsync(r){this.reactions=r;}};store.set(n.id,n);return n;}
function hydrate(x){let n=node(x.type,x.id);Object.assign(n,{...x,children:[]});for(const c of x.children||[])n.appendChild(hydrate(c));return n;}
baseline.forEach(hydrate);
const api={loadFontAsync:async()=>{},getNodeByIdAsync:async id=>store.get(id)};
for(const type of ['Rectangle','Ellipse','Text','Vector'])api['create'+type]=()=>node(type.toUpperCase());
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const px=n=>Math.round(n*100)/100;
const color=v=>'#'+Math.round(v*255).toString(16).padStart(2,'0').repeat(3);
(async()=>{
 let template=fs.readFileSync(path.join(dir,'visual-update.template.js.txt'),'utf8').replace('__MANIFEST__',JSON.stringify(manifest)).replace('__STATES__',JSON.stringify(Object.keys(manifest.state_nodes)));
 await new (Object.getPrototypeOf(async function(){}).constructor)('figma',template)(api);
 const output={};
 for(const state of spec.states){const sid=state.id,f=store.get(manifest.state_nodes[sid].node_id),b=baseline.find(x=>x.id===f.id),sc=f.children.find(x=>x.name==='visual-scene');let native={};
 const oldScene=b.children.find(x=>x.name==='scene-placeholder'||x.name==='visual-scene');const reused=new Set();
 function render(n){const norm=s=>s.replace(/\s+/g,' ');const old=oldScene.children.find(o=>norm(o.name)===norm(n.name)&&!reused.has(o.id));if(old)reused.add(old.id);const key=old?.authoringKey||sid+'/v2/'+n.id.replace(':','-');const text=n.type==='TEXT';const cls=['absolute',`left-[${px(n.x)}px]`,`top-[${px(n.y)}px]`,`w-[${px(Math.max(.01,n.width))}px]`,`h-[${px(Math.max(.01,text?Math.min(n.height,420-n.y):n.height))}px]`];let fig={name:n.name};
 if(text){cls.push(`text-[${n.fontSize||24}px]`,`text-[${color(n.fills?.[0]?.color.r??.2)}]`);fig.text={fontName:{family:'Noto Sans SC',style:'Regular'}};}
 else{fig.shape={type:n.type};if(n.type==='VECTOR')fig.shape.paths=n.vectorPaths;cls.push(n.fills?.length?`bg-[${color(n.fills[0].color.r)}]`:'bg-transparent');if(n.strokes){cls.push(`border-[${n.strokeWeight||2}px]`,`border-[${color(n.strokes[0].color.r)}]`);if(n.dashPattern)fig.stroke={dashPattern:n.dashPattern};}if(n.cornerRadius)cls.push(`rounded-[${n.cornerRadius}px]`);}
 native[key]={figma:fig};return `<${text?'span':'div'} data-key="${key}" ${old?`data-node-id="${old.id}"`:''} class="${cls.join(' ')}">${text?esc(n.characters):''}</${text?'span':'div'}>`;
 }
 const sceneKey=sid+'/scene',rootKey=sid+'/root';native[sceneKey]={figma:{name:'visual-scene'}};
 const oldText=oldScene.children.find(x=>x.name==='scene');
 let hidden=oldText?`<span data-key="${oldText.authoringKey||sid+'/old-scene'}" data-node-id="${oldText.id}" class="absolute left-[32px] top-[32px] w-[1440px] h-[40px] hidden"></span>`:'';
 let markup=`<div data-key="${rootKey}" data-node-id="${f.id}" class="w-[1600px] h-[900px]">`;
 const body=b.children.find(x=>x.name==='body');if(body)markup+=`<span data-key="${sid}/body" data-node-id="${body.id}" class="absolute left-[48px] top-[110px] w-[1504px] h-[40px] hidden"></span>`;
 const drawings=sc.children.map(render).join('');
 for(const o of oldScene.children.filter(o=>!reused.has(o.id)&&o.id!==oldText?.id)){const k=o.authoringKey||sid+'/retained/'+o.id.replace(':','-'),t=o.type==='TEXT'?'span':'div';native[k]={figma:o.type==='TEXT'?{name:o.name}:{shape:{type:o.type}}};hidden+=`<${t} data-key="${k}" data-node-id="${o.id}" class="absolute left-[${o.x}px] top-[${o.y}px] w-[${Math.max(.01,o.width)}px] h-[${Math.max(.01,o.height)}px] hidden"></${t}>`;}
 markup+=`<div data-key="${sceneKey}" data-node-id="${sc.id}" class="absolute left-[48px] top-[160px] w-[1504px] h-[420px] bg-[#fafafa] overflow-hidden">${hidden}${drawings}</div>`;
 // Adopt and move existing reaction-bearing controls onto corresponding visual targets.
 const assigned=new Set();let moved=[];
 for(const ctl of state.controls){const candidates=sc.children.filter(n=>n.reactions?.[0]?.actions?.[0]?.destinationId===manifest.state_nodes[ctl.target]?.node_id&&!assigned.has(n.id));
 // Existing state transitions remain authoritative; only one existing target is moved per visual area.
 const n=candidates.find(n=>n.name.startsWith('hotspot'))||candidates[0];if(!n)continue;assigned.add(n.id);
 const existing=b.children.find(c=>c.id===manifest.state_nodes[sid].controls[ctl.id]);if(!existing)continue;
 const x=48+n.x,y=160+n.y,w=Math.max(60,n.width),h=Math.max(60,n.height);let key=sid+'/control/'+ctl.id;
 markup+=`<div data-key="${key}" data-node-id="${existing.id}" class="absolute left-[${px(x)}px] top-[${px(y)}px] w-[${px(w)}px] h-[${px(h)}px] bg-transparent border-transparent">`;
 for(const label of existing.children||[])markup+=`<span data-key="${key}/label" data-node-id="${label.id}" class="absolute left-[0px] top-[0px] w-[${px(w)}px] h-[40px] hidden"></span>`;
 markup+='</div>';moved.push({control:ctl.id,id:existing.id,target:ctl.target,x,y,w,h});
 }
 markup+='</div>';
 output[sid]={mode:'update',targetNodeId:f.id,markup,native};
 fs.writeFileSync(path.join(dir,sid+'.payload.json'),JSON.stringify(output[sid],null,2));
 }
 fs.writeFileSync(path.join(dir,'tempad-payloads.json'),JSON.stringify(output));
 console.log(JSON.stringify({states:Object.keys(output).length,nativeShapes:Object.values(output).reduce((n,p)=>n+Object.keys(p.native).length,0)}));
})();
