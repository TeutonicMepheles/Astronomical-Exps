/* Local observation points are data only. Replace the frame sheets to reuse the same UI. */
window.LightPollution.observationPoints=[{
 id:'tree-landscape-light',
 eyebrow:'局部观察',
 title:'树旁景观灯',
 description:'拖动亮度滑杆，逐帧观察前 4 秒内景观灯由关闭到最亮时，树木受光与地面光斑的变化。',
 hotspot:{x:1040,y:520,label:'观察树旁景观灯'},
 frames:{
  alt:'树旁景观灯从完全关闭逐渐提升到最大亮度的局部观察帧',
  fps:20,durationSeconds:4,totalFrames:81,frameWidth:768,frameHeight:432,
  crop:{x:0,y:0,width:1,height:1},
  sheets:[
   {src:'../assets/observation-tree-light-v2-frames/atlas-00.webp',firstFrame:0,count:20,columns:5,rows:4},
   {src:'../assets/observation-tree-light-v2-frames/atlas-01.webp',firstFrame:20,count:20,columns:5,rows:4},
   {src:'../assets/observation-tree-light-v2-frames/atlas-02.webp',firstFrame:40,count:20,columns:5,rows:4},
   {src:'../assets/observation-tree-light-v2-frames/atlas-03.webp',firstFrame:60,count:20,columns:5,rows:4},
   {src:'../assets/observation-tree-light-v2-frames/atlas-04-final.webp',firstFrame:80,count:1,columns:1,rows:1}
  ]
 },
 note:'滑杆 0% 对应 0.00 秒，100% 对应 4.00 秒；画面按每秒 20 帧直接切换，不播放视频。'
}];
