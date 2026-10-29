window.LightPollution.createDraftStorage=(key,storage=localStorage)=>({read:()=>storage.getItem(key),write:value=>storage.setItem(key,value)});
