/* Export self-contained SVG image crops using the same native UI geometry. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),context={window:{LightPollution:{}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'features/lamps/variants.js'),'utf8'),context);
for(const [id,t]of Object.entries(context.window.LightPollution.lampVariants)){
 const png=fs.readFileSync(path.join(root,'assets/lamp-variants',t.file)).toString('base64');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="320" viewBox="${t.thumbnail}" role="img" aria-label="${t.label}"><title>${t.label}</title><defs><clipPath id="body"><path d="${t.path}"/></clipPath></defs><image width="${t.width||1024}" height="${t.height||1536}" href="data:image/png;base64,${png}" clip-path="url(#body)"/></svg>\n`;
 fs.writeFileSync(path.join(root,'assets/lamp-variants/shade-'+id+'.svg'),svg);
}
console.log('Exported five self-contained shade SVGs; original pixels and alpha preserved.');
