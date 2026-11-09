(() => {
  const banner=document.querySelector('.grade-banner');
  if(!banner||!window.PollutionIndex)return;
  const number=banner.querySelector('[data-grade-int]');
  const copy=banner.querySelector('[data-grade-copy]');

  function render(){
    const result=window.PollutionIndex.evaluate(window.PollutionIndex.readDocument());
    number.textContent=String(result.rounded);
    copy.textContent=result.description;
    banner.setAttribute('aria-label',`当前光污染等级 ${result.rounded} 级。${result.description}`);
  }

  document.addEventListener('input',render);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-curtain],[data-shade],[data-dock-curtain],[data-dock-shade]')){
      requestAnimationFrame(render);
    }
  });
  render();
})();
