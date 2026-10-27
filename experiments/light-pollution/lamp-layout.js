// All fixtures use one display height; no per-instance size reduction.
const foregroundLampHeight = 155;
// Positions use the 2172 × 724 panorama coordinate system; all fixtures share one edit group.
window.ForegroundLamps = [
  {id:'residential-west',x:269,y:587,kind:'路灯'},
  {id:'residential-east',x:473,y:588,kind:'路灯'},
  {id:'library-east',x:934,y:587,kind:'路灯'},
  {id:'commercial-east',x:1484,y:591,kind:'路灯'},
  {id:'promenade-entry',x:1621,y:591,kind:'路灯'},
  {id:'promenade-west',x:1715,y:591,kind:'路灯'},
  {id:'promenade-east',x:1880,y:591,kind:'路灯'},
  {id:'path-01',x:180,y:584,kind:'步道灯'},
  {id:'path-02',x:395,y:584,kind:'步道灯'},
  {id:'path-03',x:608,y:584,kind:'步道灯'},
  {id:'path-04',x:878,y:584,kind:'步道灯'},
  {id:'path-05',x:1054,y:584,kind:'步道灯'},
  {id:'path-06',x:1318,y:584,kind:'步道灯'}
].map(lamp => ({...lamp, height: foregroundLampHeight}));
