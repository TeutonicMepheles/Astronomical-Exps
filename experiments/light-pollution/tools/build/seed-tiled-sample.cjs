/* Explicit opt-in: create the initial map; never run during ordinary builds. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'scenes/tiled-sample'),assets=path.join(root,'assets/panorama-20261111');
if(fs.existsSync(path.join(dir,'city.tmj')))throw Error('Map exists; keep artist edits');
fs.mkdirSync(dir,{recursive:true});
const layout=JSON.parse(fs.readFileSync(path.join(assets,'layout.json')));
const files=[...new Set(layout.layers.map(l=>l.file))];
const tiles=files.map((file,id)=>{const b=fs.readFileSync(path.join(assets,file));return {id,image:'../../assets/panorama-20261111/'+file,imagewidth:b.readUInt32BE(16),imageheight:b.readUInt32BE(20)};});
const changes={residential:{dx:75,dy:15,scale:.85},public:{dx:-35,dy:-15,scale:1.08},'trees-03':{dx:-60,dy:-25,scale:1.15},'roadlamp-1':{dx:-65,dy:-8,scale:1.12}};
const objects=layout.layers.map((l,i)=>{const tile=tiles[files.indexOf(l.file)],v=changes[l.id]||{},s=v.scale||1;return {id:i+1,name:l.id,type:'',gid:tile.id+1,x:l.x+(v.dx||0),y:l.y+(v.dy||0),width:l.width*s,height:(l.height||l.width*tile.imageheight/tile.imagewidth)*s,rotation:0,visible:true};});
// Place a tree behind the public building so the sample exercises explicit painter order.
const tree=objects.splice(objects.findIndex(o=>o.name==='trees-03'),1)[0];objects.splice(objects.findIndex(o=>o.name==='public'),0,tree);
const ts={type:'tileset',version:'1.10',tiledversion:'1.12.2',name:'Existing transparent images',tilewidth:Math.max(...tiles.map(t=>t.imagewidth)),tileheight:Math.max(...tiles.map(t=>t.imageheight)),tilecount:tiles.length,columns:0,margin:0,spacing:0,objectalignment:'topleft',tiles};
const map={type:'map',version:'1.10',tiledversion:'1.12.2',orientation:'orthogonal',renderorder:'right-down',infinite:false,width:layout.width,height:layout.height,tilewidth:1,tileheight:1,nextlayerid:2,nextobjectid:objects.length+1,tilesets:[{firstgid:1,source:'images.tsj'}],layers:[{id:1,name:'City images — back to front',type:'objectgroup',draworder:'index',opacity:1,visible:true,objects}]};
fs.writeFileSync(path.join(dir,'images.tsj'),JSON.stringify(ts,null,2)+'\n');fs.writeFileSync(path.join(dir,'city.tmj'),JSON.stringify(map,null,2)+'\n');
console.log('Created editable Tiled map with original transparent PNGs.');
