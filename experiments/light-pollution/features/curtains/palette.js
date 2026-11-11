/* One approved development texture. Keep the URL stable for live and offline builds. */
(function(){
 const path='../assets/curtain-textures-v2/charcoal-blackout.png';
 window.STREET_CURTAINS=[{
  name:'炭蓝 · 遮光宽褶',
  image:window.LIB_STATIC_ASSETS?.[path]||path
 }];
})();
