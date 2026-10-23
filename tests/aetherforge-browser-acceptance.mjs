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
 await run('browser Node execution invokes isolated Docker only after user approval',async()=>{
  desktop.once('dialog',dialog=>dialog.accept('qa-node.js'));
  await desktop.locator('[data-afide="add"]').click();
  await desktop.locator('#afideCode').fill("console.log('AETHERFORGE_UI_NODE_PASS')");
  await desktop.locator('[data-afide="execute"]').waitFor({state:'visible'});
  assert.equal(await desktop.locator('#afideRunLanguage').inputValue(),'node');
  desktop.once('dialog',dialog=>dialog.accept());
  await desktop.locator('[data-afide="execute"]').click();
  await desktop.locator('#afideExecOutput').getByText('AETHERFORGE_UI_NODE_PASS',{exact:false}).waitFor({timeout:30000});
  assert.match(await desktop.locator('#afideExecOutput').innerText(),/COMPLETED.*Exit 0/);
 });
 await run('browser Python execution invokes isolated Docker after approval',async()=>{
  desktop.once('dialog',dialog=>dialog.accept('qa-python.py'));
  await desktop.locator('[data-afide="add"]').click();
  await desktop.locator('#afideCode').fill("print('AETHERFORGE_UI_PYTHON_PASS')");
  assert.equal(await desktop.locator('#afideRunLanguage').inputValue(),'python');
  desktop.once('dialog',dialog=>dialog.accept());
  await desktop.locator('[data-afide="execute"]').click();
  await desktop.locator('#afideExecOutput').getByText('AETHERFORGE_UI_PYTHON_PASS',{exact:false}).waitFor({timeout:30000});
  assert.match(await desktop.locator('#afideExecOutput').innerText(),/COMPLETED.*Exit 0/);
 });
 await run('browser source editing persists through Saved Projects and reload',async()=>{
  await desktop.locator('[data-afide-open="index.html"]').click();
  await desktop.locator('#afideCode').fill('<main><h1>AETHERFORGE_BROWSER_PERSISTENCE_PASS</h1></main>');
  await desktop.locator('[data-afide="browse"]').click();
  const item=desktop.locator('#afideSavedPanel [data-afide-load]').first();
  await item.waitFor({state:'visible',timeout:15000});
  const projectId=await item.getAttribute('data-afide-load');
  assert.match(projectId,/^project_[a-z0-9]+$/);
  const loaded=await desktop.request.get(base+'api/workspace/projects/'+projectId);
  assert.equal(loaded.status(),200);
  assert.match(JSON.stringify((await loaded.json()).project),/AETHERFORGE_BROWSER_PERSISTENCE_PASS/);
  await desktop.reload({waitUntil:'domcontentloaded'});
  await desktop.locator('.sidebar [data-page="ide"]').click();
  assert.match(await desktop.locator('#afideCode').inputValue(),/AETHERFORGE_BROWSER_PERSISTENCE_PASS/);
 });
 await run('browser source ZIP export and re-import preserves HTML and runnable files',async()=>{
  const downloadPromise=desktop.waitForEvent('download',{timeout:15000});
  await desktop.locator('[data-afide="zip"]').click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/\.zip$/);
  const {readFile}=await import('node:fs/promises');
  const bytes=await readFile(await download.path());
  await desktop.locator('#afideProjectFile').setInputFiles({name:'qa-source.zip',mimeType:'application/zip',buffer:bytes});
  await desktop.locator('#afideCode').waitFor({state:'visible'});
  assert.match(await desktop.locator('#afideCode').inputValue(),/AETHERFORGE_BROWSER_PERSISTENCE_PASS/);
  assert.equal(await desktop.locator('[data-afide-open="qa-node.js"]').count(),1);
  assert.equal(await desktop.locator('[data-afide-open="qa-python.py"]').count(),1);
 });
 await run('switching to a new project flushes pending text and preserves old workspace',async()=>{
  const id=await desktop.evaluate(()=>localStorage.getItem('aetherforge-ide-project-id-v1'));
  await desktop.locator('[data-afide-open="index.html"]').click();
  await desktop.locator('#afideCode').fill('<main>AETHERFORGE_SWITCH_PRESERVED</main>');
  desktop.once('dialog',dialog=>dialog.accept());
  await desktop.locator('[data-afide="new"]').click();
  assert.doesNotMatch(await desktop.locator('#afideCode').inputValue(),/AETHERFORGE_SWITCH_PRESERVED/);
  const saved=await desktop.request.get(base+'api/workspace/projects/'+id);
  assert.equal(saved.status(),200);
  assert.match(JSON.stringify((await saved.json()).project),/AETHERFORGE_SWITCH_PRESERVED/);
  await desktop.locator('[data-afide="browse"]').click();
  const old=desktop.locator('#afideSavedPanel [data-afide-load="'+id+'"]');
  await old.waitFor({state:'visible'});
  desktop.once('dialog',dialog=>dialog.accept());
  await old.click();
  assert.match(await desktop.locator('#afideCode').inputValue(),/AETHERFORGE_SWITCH_PRESERVED/);
 });
 await run('failed server save blocks project switch and retains unsaved editor text',async()=>{
  await desktop.locator('#afideCode').fill('<main>AETHERFORGE_UNSAVED_IS_SAFE</main>');
  await desktop.route('**/api/workspace/projects/*',async route=>{
   if(route.request().method()==='PUT')await route.fulfill({status:503,contentType:'application/json',body:'{"error":"simulated unavailable server"}'});
   else await route.continue();
  });
  try{
   desktop.once('dialog',dialog=>dialog.accept());
   await desktop.locator('[data-afide="new"]').click();
   await desktop.locator('#afideCode').getByText('AETHERFORGE_UNSAVED_IS_SAFE',{exact:false}).waitFor();
   assert.match(await desktop.locator('#afideCode').inputValue(),/AETHERFORGE_UNSAVED_IS_SAFE/);
  }finally{await desktop.unroute('**/api/workspace/projects/*');}
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
