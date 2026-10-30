import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createWorkbenchServer as commercialServer} from '../apps/aetherforge-commercial/server.mjs';
import {createWorkbenchServer as companionServer} from '../apps/aetherforge-workbench/server.mjs';
import {buildCommercialPackage} from '../tools/package-aetherforge-commercial.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright-core');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
const temporary=await mkdtemp(join(tmpdir(),'aetherforge-corpus-browser-'));
const manifest=JSON.parse(await readFile('apps/aetherforge-corpus/manifest.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const servers=[];
let passed=0;
try{
 const context=await browser.newContext({acceptDownloads:true});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  return url.protocol==='file:'||url.hostname==='127.0.0.1'?route.continue():route.abort();
 });
 const page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 async function checkViewer(url,label){
  await page.goto(url);await page.locator('.file').first().waitFor();
  assert.equal(await page.locator('.file').count(),60);
  assert.match(await page.locator('#count').innerText(),/1,610 of 1,610/);
  await page.locator('#next').click();assert.equal(await page.locator('#page').innerText(),'Page 2 of 27');
  const original=manifest.files.find(f=>f.path.includes('.drive-'));
  await page.locator('#search').fill(original.id);
  assert.equal(await page.locator('.file').count(),1);
  assert.equal(await page.locator('#path').innerText(),original.path);
  const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();
  const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),original.path.split('/').pop());
  assert.equal(hash(await readFile(await download.path())),original.sha256);
  const zipPromise=page.waitForEvent('download');await page.getByText('Download all 1,610 files · ZIP',{exact:true}).click();
  assert.equal(hash(await readFile(await (await zipPromise).path())),manifest.archiveSha256);
  await page.locator('#search').fill('no such reference file 000000');
  assert.equal(await page.locator('#download').isDisabled(),true);
  await page.locator('#search').fill('');await page.locator('#category').selectOption('Backend Engineering');
  const backend=manifest.files.filter(f=>f.category==='Backend Engineering').length;
  assert.match(await page.locator('#count').innerText(),new RegExp(backend.toLocaleString()+' of 1,610'));
  assert.ok(await page.locator('.file').count()>0);
  await page.locator('#category').selectOption('All');
  const hostile='</pre><img id="corpus-injection" src=x onerror="window.__corpusRan=true"><script>window.__corpusRan=true</script>';
  const hostileId=await page.evaluate(value=>{
   const file=window.AETHERFORGE_CORPUS.files[0];file.contentBase64=btoa(value);file.name=value;return file.id;
  },hostile);
  await page.locator('#search').fill(hostileId);
  assert.equal(await page.locator('#source').textContent(),hostile);
  assert.equal(await page.locator('#filename').textContent(),hostile);
  assert.equal(await page.locator('#corpus-injection').count(),0);
  assert.equal(await page.evaluate(()=>window.__corpusRan),undefined);
  assert.deepEqual(errors,[]);
  passed++;console.log('PASS '+label+' searches, pages, filters, downloads exact originals and renders inert text');
 }
 for(const [label,createServer] of [['Commercial',commercialServer],['Companion',companionServer]]){
  const server=createServer();servers.push(server);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(base);
  await page.locator('.sidebar .corpus-link').click();
  assert.match(page.url(),/aetherforge-corpus\/index.html$/);
  await checkViewer(page.url(),label);
  if(label==='Commercial'){
   await page.goto(base);await page.locator('.sidebar [data-page="library"]').click();
   await page.locator('#aflOrigin').selectOption('corpus');
   await page.getByText('Showing 1610 /',{exact:false}).waitFor();
   assert.equal(await page.evaluate(()=>window.AetherForgeLibrary.getCorpus().length),1610);
   const original=manifest.files.find(f=>f.path.includes('.drive-'));
   await page.locator('#aflSearch').fill(original.name);
   await page.locator(`[data-afl-select="corpus:${original.id}"]`).click();
   const pending=page.waitForEvent('download');await page.locator('[data-afl-download]').click();
   assert.equal(hash(await readFile(await (await pending).path())),original.sha256);
   passed++;console.log('PASS Commercial Library indexes all originals and downloads original bytes');
  }
 }
 const bundle=join(temporary,'bundle');await buildCommercialPackage(bundle);
 const offline=await browser.newContext({acceptDownloads:true,offline:true});
 const offlinePage=await offline.newPage();
 await offlinePage.goto(pathToFileURL(join(bundle,'apps/aetherforge-corpus/index.html')).href);
 await offlinePage.locator('.file').first().waitFor();
 assert.equal(await offlinePage.locator('.file').count(),60);
 await offlinePage.locator('#search').fill(manifest.files.at(-1).id);
 assert.equal(await offlinePage.locator('#sha').textContent(),manifest.files.at(-1).sha256);
 await offlinePage.setViewportSize({width:390,height:844});
 assert.ok(await offlinePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const screenshots=process.env.AETHERFORGE_SCREENSHOT_DIR;
 if(screenshots)await offlinePage.screenshot({path:resolve(screenshots,'corpus-mobile.png'),fullPage:true});
 passed++;console.log('PASS extracted ZIP opens offline, reaches the final original and fits mobile');
 console.log(`${passed} browser scenarios passed; no live service calls required.`);
}finally{
 await browser.close();
 for(const server of servers)await new Promise(resolve=>server.close(resolve));
 await rm(temporary,{recursive:true,force:true});
}
