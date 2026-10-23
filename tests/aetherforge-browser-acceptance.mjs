/**
 * Real Chromium acceptance for the commercial workbench.
 * Browser QA runs against a disposable localhost server only; it never executes
 * imported source on the Codespaces host or publishes a forwarded port.
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base='http://127.0.0.1:4546/';
const chromePath=process.env.CHROME_PATH;
assert.ok(chromePath,'GitHub runner must provide Google Chrome');
const browser=await chromium.launch({headless:true,executablePath:chromePath,args:['--no-sandbox','--disable-dev-shm-usage']});
const dir='artifacts/aetherforge-browser';
await mkdir(dir,{recursive:true});
const results=[];
async function run(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS '+name)}catch(err){results.push({name,status:'FAIL',error:String(err)});console.error('FAIL '+name,err.message)}}
try{
 const desktop=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 await run('desktop dashboard boots connected commercial UI',async()=>{
  const r=await desktop.goto(base,{waitUntil:'domcontentloaded'});
  assert.equal(r.status(),200);
  await desktop.locator('.sidebar [data-page="ide"]').click();
  await desktop.locator('#afideCode').waitFor({state:'visible'});
  assert.match(await desktop.locator('#afideName').inputValue(),/Untitled engineering project/);
 });
 await run('browser viewport renders and executes trusted isolated starter interaction',async()=>{
  await desktop.locator('[data-afide="run"]').click();
  const frame=desktop.frameLocator('#afidePreview');
  await frame.locator('#sandbox-root h1').waitFor({state:'visible',timeout:12000});
  assert.match(await frame.locator('#sandbox-root h1').innerText(),/ÆTHERFORGE/);
  await frame.locator('#sandbox-root button').click();
  await frame.locator('#sandbox-root p').getByText(/Your component is running/).waitFor({timeout:8000});
  assert.match(await desktop.locator('#afidePreviewPath').innerText(),/PREVIEW: index.html/);
 });
 await run('runtime defaults to Node when JavaScript source selected',async()=>{
  await desktop.locator('[data-afide-open="script.js"]').click();
  assert.equal(await desktop.locator('#afideRunLanguage').inputValue(),'node');
  assert.equal(await desktop.locator('[data-afide="execute"]').isDisabled(),false);
  await desktop.locator('[data-afide="run"]').click();
  assert.match(await desktop.locator('#afideConsole').innerText(),/No HTML preview was started/);
 });
 await desktop.screenshot({path:dir+'/desktop-ide.png',fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await run('mobile IDE navigation, editor sizing, and non-overflow',async()=>{
  const r=await mobile.goto(base,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);
  await mobile.locator('.mobile-nav [data-page="ide"]').click();
  await mobile.locator('#afideCode').waitFor({state:'visible'});
  const widths=await mobile.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  assert.ok(widths.scroll<=widths.viewport+3,JSON.stringify(widths));
  assert.equal(await mobile.locator('#afideRunLanguage').inputValue(),'node');
 });
 await mobile.screenshot({path:dir+'/mobile-ide.png',fullPage:true});
 await desktop.close();await mobile.close();
}finally{
 await browser.close();
}
const failures=results.filter(x=>x.status==='FAIL');
console.log('ÆTHERFORGE real-browser acceptance: '+(results.length-failures.length)+' PASS / '+failures.length+' FAIL');
if(failures.length)process.exitCode=1;
