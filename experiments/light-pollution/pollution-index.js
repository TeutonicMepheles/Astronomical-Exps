(() => {
  const WEIGHTS={residential:1,publicBuilding:1.2,billboard:1.5,lamp:2};
  const CURTAIN_K={25:.75,50:.5,75:.25,100:0};
  const SHADE_K={full:1,half:2,open:4};
  const BILLBOARD_T=1;

  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

  function brightnessFactor(percent){return clamp(Number(percent)||0,0,100)/100;}

  function temperatureFactor(cct){
    return 1+((Number(cct)||3000)-3000)/3500*0.8;
  }

  function curtainFactor(percent){
    const key=Number(percent);
    if(Object.prototype.hasOwnProperty.call(CURTAIN_K,key))return CURTAIN_K[key];
    if(!(key>0))return 1;
    return clamp(1-key/100,0,1);
  }

  function shadeFactor(mode){return SHADE_K[mode]||SHADE_K.half;}

  function term(weight,brightness,temperature,extra){
    return weight*brightnessFactor(brightness)*temperature*extra;
  }

  function sMax(){
    const cold=temperatureFactor(6500);
    return term(WEIGHTS.residential,100,cold,curtainFactor(25))
      +term(WEIGHTS.publicBuilding,100,cold,1)
      +term(WEIGHTS.billboard,100,BILLBOARD_T,1)
      +term(WEIGHTS.lamp,100,cold,shadeFactor('open'));
  }

  const DESCRIPTIONS={
    1:'黄道光、对日照和黄道带均清晰可见，银河在天蝎座与人马座区域亮到能在地面投出影子，三角座星系（M33）是肉眼直视目标。',
    2:'黄道光呈明显黄色且在黎明或黄昏时足以投出微弱影子，夏季银河结构高度复杂，云只以星空背景上的“黑洞”形式出现。',
    3:'地平线附近已有光污染迹象，但银河仍显复杂，M33 用余光法容易看到，春秋季黄道光显著且颜色可辨。',
    4:'地平线多个方向可见光污染穹顶，银河在地平线以上仍令人印象深刻但细节丢失，M33 仅在高度较高时用余光法勉强可见。',
    5:'仅春秋季最佳夜晚可见少许黄道光，地平线附近的银河已不可见，天顶方向银河褪色，云比背景天空更亮。',
    6:'黄道光不可见，银河仅在天顶方向可辨认，地平线以上 35° 范围内的天空发出灰白光，云在任何位置都相当亮。',
    7:'整个天空呈浅灰白色，银河几乎不可见或完全不可见，只有昴星团（M45）等少数梅西耶天体肉眼可辨。',
    8:'银河不可见，仅昴星团等少数天体容易看到，星座可见但缺少关键恒星，云被明亮照亮，光穹可延伸至地平线以上 60°。',
    9:'天空被完全照亮，肉眼仅能看见最亮的五六颗恒星和行星，多数星座无法辨认，地面被天空辉光直接照亮。'
  };

  function readDocument(){
    const value=selector=>Number(document.querySelector(selector)?.value||0);
    const curtain=document.querySelector('[data-curtain][aria-pressed="true"]');
    const shade=document.querySelector('[data-shade][aria-pressed="true"]');
    return {
      residential:{
        brightness:value('#residential-brightness'),
        cct:value('#residential-temperature'),
        curtain:curtain?Number(curtain.dataset.curtain):0
      },
      publicBuilding:{
        brightness:value('#public-building-brightness'),
        cct:value('#public-building-temperature')
      },
      billboard:{brightness:value('#billboard-brightness')},
      lamp:{
        brightness:value('#lamp-brightness'),
        cct:value('#temperature'),
        shade:shade?shade.dataset.shade:'half'
      }
    };
  }

  function evaluate(state){
    const residentialT=temperatureFactor(state.residential.cct);
    const publicT=temperatureFactor(state.publicBuilding.cct);
    const lampT=temperatureFactor(state.lamp.cct);
    const residential=term(WEIGHTS.residential,state.residential.brightness,residentialT,curtainFactor(state.residential.curtain));
    const publicBuilding=term(WEIGHTS.publicBuilding,state.publicBuilding.brightness,publicT,1);
    const billboard=term(WEIGHTS.billboard,state.billboard.brightness,BILLBOARD_T,1);
    const lamp=term(WEIGHTS.lamp,state.lamp.brightness,lampT,shadeFactor(state.lamp.shade));
    const s=residential+publicBuilding+billboard+lamp;
    const max=sMax();
    const p=max>0?clamp(s/max,0,1):0;
    const continuous=1+8*p;
    const rounded=clamp(Math.round(continuous),1,9);
    return {
      s,sMax:max,p,continuous,rounded,description:DESCRIPTIONS[rounded],
      parts:{residential,publicBuilding,billboard,lamp},
      factors:{
        residentialT,publicT,billboardT:BILLBOARD_T,lampT,
        curtainK:curtainFactor(state.residential.curtain),
        shadeK:shadeFactor(state.lamp.shade)
      }
    };
  }

  window.PollutionIndex={WEIGHTS,DESCRIPTIONS,brightnessFactor,temperatureFactor,curtainFactor,shadeFactor,sMax,readDocument,evaluate};
})();
