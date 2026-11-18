import assert from 'node:assert/strict';
import {localSolarStages} from './js/local-solar-stages.mjs';
const mid=Math.PI+.024;
const sky=(impact,moonR=.011)=>(phi)=>({sep:Math.hypot(phi-mid,impact),sunR:.01,moonR});
const full=localSolarStages(sky(0));assert.equal(full.length,5);assert.equal(full[1].name,'食既');assert(Math.abs(full[2].phi-mid)<1e-7);assert(Math.abs(full[0].phi-(mid-.021))<1e-9);
const partial=localSolarStages(sky(.015));assert.equal(partial.length,5);assert.equal(partial.filter(n=>n.kind==='teaching').length,2);assert(Math.abs(partial[2].phi-mid)<1e-7);
const annular=localSolarStages(sky(0,.009));assert.equal(annular[1].name,'环食始');assert.equal(annular[3].name,'环食终');assert.deepEqual(localSolarStages(sky(.03)),[]);
console.log('PASS local contacts: off-center maximum, exact outer contacts, full/partial/annular/none, explicitly marked teaching nodes.');
