/* Reuse the original local artwork and silhouette; no regenerated lamp identities.
 * One SVG viewport extracts only the shade, excluding the long pole and base.
 */
LightPollution.createLampThumbnail=function(id,source,prefix='lamp-choice'){
 const t=LightPollution.lampVariants[id],ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',t.thumbnail||'325 15 375 350');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),outline=document.createElementNS(ns,'path');
 clip.id=prefix+'-'+id;outline.setAttribute('d',t.path);clip.append(outline);defs.append(clip);
 const picture=document.createElementNS(ns,'image');picture.setAttribute('href',source);picture.setAttribute('width',t.width||1024);picture.setAttribute('height',t.height||1536);picture.setAttribute('clip-path','url(#'+clip.id+')');
 svg.append(defs,picture);return svg;
};
