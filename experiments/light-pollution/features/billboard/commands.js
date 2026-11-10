/* Both presentation and authoring UI call these commands, never one another. */
window.LightPollution.createBillboardCommands = function ({ getObject, locked, change, restart, setResource, resetFrame, elapsed, reduced, gesture }) {
  let pending=null;
  function commitGesture(){if(pending){const before=pending;pending=null;gesture.commit(before);}}
  function cancelGesture(){if(pending){const before=pending;pending=null;gesture.cancel(before);}}
  function validate(key,value){const max={brightness:200,bloom:100,glitch:100,dots:100}[key];if(max===undefined||!Number.isFinite(value)||value<0||value>max)throw Error('屏幕参数越界');}
  function mutate(fn) { commitGesture();const o=getObject(); if(!o||locked(o))return false;change(()=>fn(o));return true; }
  return {
    commitGesture,cancelGesture,
    previewValue(key,value){validate(key,value);const o=getObject();if(!o||locked(o))return false;if(!pending)pending=gesture.begin();o[key]=value;gesture.preview();return true;},
    setValue(key,value){validate(key,value);return mutate(o=>{o[key]=value;});},
    setResource(id){if(!['03','08'].includes(id))throw Error('未知动态屏幕资源');return mutate(o=>{o.resource=id;o.images=[];o.playing=true;setResource(id);restart();});},
    toggle(){return mutate(o=>{if(o.playing&&!reduced())o.slide+=Math.floor(elapsed()/6000);o.playing=!o.playing;resetFrame();});},
    next(){return mutate(o=>{o.slide++;resetFrame();restart();});}
  };
};
