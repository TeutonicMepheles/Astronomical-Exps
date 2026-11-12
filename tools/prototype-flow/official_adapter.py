"""Compile a flow spec for the official Figma executor, without PluginData.
Creates a new version section on an explicitly authorized existing page.
Node identities must be saved from the real build response for readback.
"""
import argparse,json
from pathlib import Path
import flow

def build_code(spec,page_id):
 return '''const spec=SPEC; const page=await figma.getNodeByIdAsync(PAGE);
if(!page || page.type!=='PAGE') throw new Error('Target page unavailable');
await figma.setCurrentPageAsync(page);
const sectionName='Prototype / '+spec.id+' / v'+spec.version;
if(page.children.some(n=>n.name===sectionName)) throw new Error('Version already exists: inspect before retry');
const fonts=await figma.listAvailableFontsAsync();
const font=fonts.map(f=>f.fontName).find(f=>f.family==='Noto Sans SC'&&f.style==='Regular');
if(!font) throw new Error('Noto Sans SC Regular unavailable');
await figma.loadFontAsync(font);
const ids=[];const gray=v=>[{type:'SOLID',color:{r:v,g:v,b:v}}];
const section=figma.createSection();ids.push(section.id);section.name=sectionName;
section.x=Math.max(0,...page.children.filter(n=>n.id!==section.id).map(n=>n.x+n.width))+240;section.y=0;
section.resizeWithoutConstraints(5280,Math.ceil(spec.states.length/3)*1040+160);
const mapping={};
function text(parent,name,value,x,y,width,size,color){const t=figma.createText();ids.push(t.id);parent.appendChild(t);t.name=name;t.fontName=font;t.fontSize=size;t.characters=value;t.fills=gray(color);t.resize(width,size*2);t.textAutoResize='HEIGHT';t.x=x;t.y=y;return t;}
for(let i=0;i<spec.states.length;i++){
 const s=spec.states[i],f=figma.createFrame();ids.push(f.id);section.appendChild(f);f.name=s.id+' / '+s.title;f.resize(1600,900);f.x=80+(i%3)*1720;f.y=80+Math.floor(i/3)*1040;f.fills=gray(.96);f.clipsContent=true;
 const record={node_id:f.id,controls:{}};mapping[s.id]=record;
 text(f,'title',s.title,48,40,1504,40,.08);text(f,'body',s.body,48,110,1504,24,.35);
 const scene=figma.createAutoLayout();ids.push(scene.id);f.appendChild(scene);scene.name='scene-placeholder';scene.layoutMode='VERTICAL';scene.resize(1504,360);scene.x=48;scene.y=208;scene.paddingTop=32;scene.paddingBottom=32;scene.paddingLeft=32;scene.paddingRight=32;scene.fills=gray(.9);scene.cornerRadius=12;
 text(scene,'scene',s.scene,0,0,1440,32,.2);
 for(const c of s.controls){const b=figma.createAutoLayout();ids.push(b.id);f.appendChild(b);b.name='control / '+c.id;b.layoutMode='HORIZONTAL';b.resize(c.width,c.height);b.x=c.x;b.y=c.y;b.primaryAxisAlignItems='CENTER';b.counterAxisAlignItems='CENTER';b.paddingLeft=16;b.paddingRight=16;b.fills=gray(c.role==='primary'?.15:.84);b.cornerRadius=10;const t=text(b,'label',c.label,0,0,c.width-32,24,c.role==='primary'?1:.1);t.textAlignHorizontal='CENTER';record.controls[c.id]=b.id;}
}
for(const s of spec.states) for(const c of s.controls){const b=await figma.getNodeByIdAsync(mapping[s.id].controls[c.id]);await b.setReactionsAsync([{trigger:{type:c.trigger},actions:[{type:'NODE',destinationId:mapping[c.target].node_id,navigation:'NAVIGATE',transition:null,preserveScrollPosition:false}]}]);}
page.flowStartingPoints=[...page.flowStartingPoints.filter(x=>x.nodeId!==mapping[spec.entry].node_id),{nodeId:mapping[spec.entry].node_id,name:spec.title+' v'+spec.version}];
return {status:'built_not_evaluated',createdNodeIds:ids,section_id:section.id,page_id:page.id,file_key:figma.fileKey||null,artifact_digest:DIGEST,state_nodes:mapping,font};
'''.replace('SPEC',json.dumps(spec,ensure_ascii=False),1).replace('PAGE',json.dumps(page_id),1).replace('DIGEST',json.dumps(flow.digest(spec)),1)

def readback_code(spec,build):
 original=(Path(__file__).parent/'figma-readback.js').read_text(encoding='utf-8')
 # Keep the existing evidence contract, replace only unsupported identity storage.
 start=original.index('  const pages =')
 end=original.index('  function descendants')
 original=original[:start]+'''  const build=BUILD;
  const page=await figma.getNodeByIdAsync(build.page_id);
  await figma.setCurrentPageAsync(page);
  const section=await figma.getNodeByIdAsync(build.section_id);
  const reverseStates=Object.fromEntries(Object.entries(build.state_nodes).map(([k,v])=>[v.node_id,k]));
  const reverseControls=Object.fromEntries(Object.values(build.state_nodes).flatMap(s=>Object.entries(s.controls).map(([k,v])=>[v,k])));
'''.replace('BUILD',json.dumps(build,ensure_ascii=False),1)+original[end:]
 original=original.replace('t.parent.getPluginData("control_id")','reverseControls[t.parent.id]')
 original=original.replace('page.children.filter(n => n.getPluginData("state_id"))','section.children.filter(n => reverseStates[n.id])')
 original=original.replace('f.getPluginData("state_id")','reverseStates[f.id]')
 original=original.replace('f.children.filter(n => n.getPluginData("control_id"))','f.children.filter(n => reverseControls[n.id])')
 original=original.replace('c.getPluginData("control_id")','reverseControls[c.id]')
 original=original.replace('__SPEC_JSON__',json.dumps(spec,ensure_ascii=False)).replace('__DIGEST_JSON__',json.dumps(flow.digest(spec)))
 original=original.replace('(async () => {','',1).rsplit('})()',1)[0]
 return original

def main():
 p=argparse.ArgumentParser();p.add_argument('spec');p.add_argument('--out',required=True);p.add_argument('--page-id');p.add_argument('--readback-manifest');a=p.parse_args()
 spec=flow.read_json(a.spec);errors=flow.validate(spec)
 if errors:raise ValueError(errors)
 out=Path(a.out)
 if out.exists():raise ValueError('Refusing to overwrite '+str(out))
 if a.readback_manifest:code=readback_code(spec,flow.read_json(a.readback_manifest))
 else:
  if not a.page_id:raise ValueError('Explicit authorized page required')
  code=build_code(spec,a.page_id)
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(code,encoding='utf-8')
 print(out)
if __name__=='__main__':main()
