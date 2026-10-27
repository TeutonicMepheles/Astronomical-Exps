const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1000}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
    await page.locator('.residential-light').evaluate(image=>image.decode());
    assert(await page.locator('.residential-editor').isHidden(),'Initial load never opens the editor');
    const windowPoints=await page.locator('.world').evaluate(world=>{
      const r=world.getBoundingClientRect();
      return [[40,280],[305,315]].map(([x,y])=>({x:r.left+x/2172*r.width,y:r.top+y/724*r.height}));
    });
    for(let cycle=0;cycle<12;cycle++){
      await page.mouse.click(windowPoints[0].x,windowPoints[0].y);
      assert(await page.locator('.residential-editor').isVisible(),'Repeated open A '+cycle);
      const firstLeft=await page.locator('.residential-editor').evaluate(el=>el.style.left);
      await page.mouse.click(windowPoints[1].x,windowPoints[1].y);
      assert(await page.locator('.residential-editor').isVisible(),'Switch directly to B '+cycle);
      assert.notEqual(await page.locator('.residential-editor').evaluate(el=>el.style.left),firstLeft,'Editor follows the newly selected window');
      await page.mouse.click(800,180);
      assert(await page.locator('.residential-editor').isHidden(),'Repeated outside close '+cycle);
    }
    const point=await page.locator('.world').evaluate(world=>{
      const r=world.getBoundingClientRect();return{x:r.left+105/2172*r.width,y:r.top+345/724*r.height};
    });
    await page.mouse.click(point.x,point.y);
    assert(await page.locator('.residential-editor').isVisible(),'Click a real window outside the keyboard shortcuts');
    const temperature=page.locator('#residential-temperature');
    const brightness=page.locator('#residential-brightness');
    await temperature.focus();await temperature.press('Home');
    assert.equal(await page.locator('#residential-temperature-value').textContent(),'2200 K');
    const out=process.env.LIGHT_SCREENSHOTS;
    if(out)await page.screenshot({path:path.join(out,'residential-warm.png')});
    await temperature.press('End');
    assert.equal(await page.locator('#residential-temperature-value').textContent(),'6500 K');
    if(out)await page.screenshot({path:path.join(out,'residential-cool.png')});
    await brightness.focus();await brightness.press('Home');
    assert.equal(await page.locator('#residential-brightness-value').textContent(),'0%');
    if(out)await page.screenshot({path:path.join(out,'residential-off.png')});
    await page.keyboard.press('Escape');
    assert(await page.locator('.residential-editor').isHidden());
    await page.mouse.click(point.x,point.y);
    assert(await page.locator('.residential-editor').isVisible(),'Off windows remain selectable');
    assert.equal(await page.locator('#residential-temperature').inputValue(),'6500');
    assert.equal(await brightness.inputValue(),'0');
    await brightness.focus();await brightness.press('End');
    await page.keyboard.press('Escape');
    await page.locator('[data-lamp="residential-east"]').click();
    assert(await page.locator('.lamp-editor').isVisible());
    assert(await page.locator('.residential-editor').isHidden());
    await page.mouse.click(point.x,point.y);
    assert(await page.locator('.residential-editor').isVisible());
    assert(await page.locator('.lamp-editor').isHidden());
    await page.keyboard.press('Escape');
    await page.mouse.move(point.x,point.y);await page.mouse.down();
    await page.mouse.move(point.x-80,point.y,{steps:8});await page.mouse.up();
    assert(await page.locator('.residential-editor').isHidden(),'Dragging from a window does not select it');
    await page.locator('.viewport').focus();await page.keyboard.press('Home');
    await page.waitForTimeout(600);
    await page.getByRole('button',{name:'编辑住宅窗灯 1',exact:true}).focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('.residential-editor').isVisible(),'Keyboard can open the editor');
    await page.mouse.click(600,180);
    assert(await page.locator('.residential-editor').isHidden(),'Blank space closes the editor');
    for(const [x,y] of [[40,290],[105,345],[310,380],[210,315],[355,450]]){
      const windowPoint=await page.locator('.world').evaluate((world,p)=>{
        const r=world.getBoundingClientRect();return{x:r.left+p[0]/2172*r.width,y:r.top+p[1]/724*r.height};
      },[x,y]);
      await page.mouse.click(windowPoint.x,windowPoint.y);
      assert(await page.locator('.residential-editor').isVisible(),'Any residential window reopens the editor');
      await page.keyboard.press('Escape');
    }
    await page.getByRole('button',{name:'编辑住宅窗灯 1',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.mouse.click(600,10);
    assert(await page.locator('.residential-editor').isHidden(),'Letterbox outside the scene dismisses the editor');
    await page.getByRole('button',{name:'编辑住宅窗灯 1',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'向右移动',exact:true}).click();
    assert(await page.locator('.residential-editor').isHidden(),'Navigation controls dismiss the editor');
    await page.locator('.position').evaluate(slider=>{
      slider.value='600';slider.dispatchEvent(new Event('input',{bubbles:true}));
    });
    const distantPoints=await page.locator('.world').evaluate(world=>{
      const r=world.getBoundingClientRect();
      return [[951,445],[1118,380]].map(([x,y])=>({x:r.left+x/2172*r.width,y:r.top+y/724*r.height}));
    });
    await page.mouse.click(distantPoints[1].x,distantPoints[1].y);
    assert(await page.locator('.residential-editor').isVisible(),'Reported distant windows also open the residential editor');
    await brightness.focus();await brightness.press('Home');
    if(out)await page.screenshot({path:path.join(out,'residential-distant-off.png')});
    await brightness.press('End');
    if(out)await page.screenshot({path:path.join(out,'residential-distant-on.png')});
    console.log('Distant window screenshot coordinates: '+JSON.stringify(distantPoints));
    assert.deepEqual(errors,[]);
    const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
    const touchPage=await touchContext.newPage();
    await touchPage.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
    const target=touchPage.getByRole('button',{name:'编辑住宅窗灯 1',exact:true});
    await target.tap();
    assert(await touchPage.locator('.residential-editor').isVisible(),'Touch opens the residential editor');
    const bounds=await touchPage.locator('.residential-editor').boundingBox();
    const stageBounds=await touchPage.locator('.stage').boundingBox();
    assert(bounds.x>=stageBounds.x&&bounds.x+bounds.width<=stageBounds.x+stageBounds.width+1);
    assert(bounds.y>=stageBounds.y&&bounds.y+bounds.height<=stageBounds.y+stageBounds.height+1);
    const transform=await touchPage.locator('.world').getAttribute('style');
    const slider=await touchPage.locator('#residential-brightness').boundingBox();
    await touchPage.touchscreen.tap(slider.x+slider.width*.45,slider.y+slider.height/2);
    const value=Number(await touchPage.locator('#residential-brightness').inputValue());
    assert(value>0&&value<100,'Touch can adjust brightness');
    assert(await touchPage.locator('.residential-editor').isVisible(),'Using sliders keeps the editor open');
    assert.equal(await touchPage.locator('.world').getAttribute('style'),transform,'Slider interaction does not pan the scene');
    await touchPage.touchscreen.tap(200,10);
    for(let cycle=0;cycle<6;cycle++){
      await target.tap();
      assert(await touchPage.locator('.residential-editor').isVisible(),'Touch repeated open '+cycle);
      assert.equal(Number(await touchPage.locator('#residential-brightness').inputValue()),value);
      await touchPage.touchscreen.tap(200,10);
      assert(await touchPage.locator('.residential-editor').isHidden(),'Touch repeated close '+cycle);
    }
    await touchContext.close();
    console.log('PASS residential window hit testing, color/brightness, off-state selection, parameter retention, exclusive editors, drag rejection, keyboard and blank-space close.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
