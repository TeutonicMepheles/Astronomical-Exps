// Model-derived evidence: no student shadow measurement is required.
export function mountShadowMeasurement() {
 let selected={value:null,saved:false},key='';
 return {
  snapshot:()=>({selected:{...selected},subsolar:{value:0,saved:true,reference:true}}),
  clearSelected(){selected={value:null,saved:false};},
  setContext(next){
   if(next.key===key)return;
   key=next.key;
   selected={value:next.shadow,saved:next.canMeasure,source:'simulation'};
   queueMicrotask(()=>window.dispatchEvent(new Event('measurement-change')));
  },
  suspend(){}
 };
}
