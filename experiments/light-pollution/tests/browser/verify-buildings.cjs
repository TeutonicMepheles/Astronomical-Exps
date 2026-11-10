const sceneDir=require('node:path').resolve(__dirname,'../../lib-static-demo');
const {chromium}=require('playwright'),assert=require('assert/strict'),path=require('path'),{pathToFileURL}=require('url');

(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(path.join(sceneDir,'standalone.html')).href+'?mode=editor');
  await page.waitForSelector('html[data-ready=true]');
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('lib-candidate-layout-v1')));
  const point=async(x,y)=>{const rect=await page.locator('#scene').boundingBox();return{x:rect.x+x*rect.width/2172,y:rect.y+y*rect.height/724};};
  const click=async(x,y)=>{const target=await point(x,y);await page.mouse.click(target.x,target.y);};
  const change=async(key,value)=>{await page.locator('#building-'+key).fill(String(value));await page.locator('#building-'+key).dispatchEvent('input');await page.locator('#building-'+key).dispatchEvent('change');};

  await click(220,300);
  assert(await page.locator('#building-controls').isVisible());
  assert((await page.locator('#building-title').textContent()).includes('住宅'));
  assert.equal(await page.locator('#building-style option').count(),1);
  assert.equal(await page.locator('#building-style option').textContent(),'炭蓝 · 遮光宽褶');
  assert.deepEqual(await page.locator('#building-material option').allTextContents(),['遮光布 · 2%']);
  await change('brightness',35);
  assert((await saved()).objects.items.filter(item=>item.parent==='residential').every(item=>item.brightness===35));
  assert((await saved()).objects.items.filter(item=>item.type==='window').every(item=>item.material==='blackout'));
  const expandedCurtain=(await saved()).objects.items.find(item=>item.id==='residential-window-1');
  assert(expandedCurtain.curtainCorners[1][0]>expandedCurtain.corners[1][0]+20,'residential curtain aperture covers the full balcony glazing');
  await page.locator('[data-building-cover="50"]').click();
  assert(new Set((await saved()).objects.items.filter(item=>item.parent==='residential').map(item=>item.coverage)).size>1);
  await page.locator('[data-building-cover="100"]').click();
  assert((await saved()).objects.items.filter(item=>item.parent==='residential').every(item=>item.coverage===100));
  await page.locator('.curtain-wind summary').click();
  await page.locator('#building-wind-strength').fill('60');
  await page.locator('#building-wind-strength').dispatchEvent('input');
  await page.locator('#building-wind-strength').dispatchEvent('change');
  await page.locator('#building-wind-speed').selectOption('1.45');
  assert((await saved()).objects.items.filter(item=>item.parent==='residential').every(item=>item.windStrength===60&&item.windSpeed===1.45));
  await page.locator('#building-wind-enabled').uncheck();
  assert((await saved()).objects.items.filter(item=>item.parent==='residential').every(item=>item.windEnabled===false));
  await page.locator('#building-wind-reset').click();
  assert((await saved()).objects.items.filter(item=>item.parent==='residential').every(item=>item.windEnabled&&item.windStrength===25&&item.windSpeed===1));

  await change('brightness',100);
  const previouslyClosed=await page.evaluate(()=>compositorLightEnvironment.getReport().totals.residential);
  await page.locator('[data-building-cover="0"]').click();
  await page.waitForFunction(closed=>compositorLightEnvironment.getReport().totals.residential>closed*10,previouslyClosed);
  const openLight=await page.evaluate(()=>compositorLightEnvironment.getReport().totals.residential);
  await page.locator('[data-building-cover="100"]').click();
  await page.waitForFunction(open=>compositorLightEnvironment.getReport().totals.residential<open*.03,openLight);
  const closedLight=await page.evaluate(()=>compositorLightEnvironment.getReport().totals.residential);
  assert(closedLight<openLight*.03,'blackout curtains reduce residential spill to about two percent');

  await page.locator('#building-image').setInputFiles({name:'charcoal-custom.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>STREET_CURTAINS[0].image.split(',')[1]),'base64')});
  await page.waitForFunction(()=>document.querySelector('#building-style-name').textContent==='charcoal-custom.png');
  assert((await saved()).buildingControls.styles[0].image.startsWith('data:'));
  await page.locator('#building-original').click();
  await page.screenshot({path:path.join(sceneDir,'building-street-preview.png')});

  await page.locator('#building-corners').click();
  assert(await page.locator('#object-panel').isVisible());
  assert.equal(await page.locator('#object-select').inputValue(),'residential-window-0');
  await page.locator('#edit-toggle').click();
  await click(700,500);
  assert((await page.locator('#building-title').textContent()).includes('公共'));
  await change('temperature',6500);
  assert((await saved()).objects.items.filter(item=>item.parent==='public').every(item=>item.temperature===6500));
  assert((await saved()).objects.items.filter(item=>item.parent==='residential').every(item=>item.temperature===3000));
  await page.locator('#building-close').click();

  const start=await point(220,300);
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x-80,start.y,{steps:3});await page.mouse.up();
  assert(await page.locator('#building-controls').isHidden());
  await page.reload();await page.waitForSelector('html[data-ready=true]');await click(220,300);
  assert.equal(await page.locator('#building-brightness').inputValue(),'100');
  assert.equal(await page.locator('#building-material').inputValue(),'blackout');
  assert.deepEqual(errors,[]);
  console.log('PASS building clicks, single charcoal blackout texture, spill attenuation, staggered curtains, replacement, corners, pan isolation and persisted settings');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
