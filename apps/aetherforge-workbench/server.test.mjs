import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkbenchServer } from './server.mjs';
let srv, url, assetRoot;
test.before(async () => {
  assetRoot=await mkdtemp(join(tmpdir(),'aetherforge-assets-'));
  srv = createWorkbenchServer({assetRoot});
  srv.listen(0,'127.0.0.1');
  await once(srv,'listening');
  url = 'http://127.0.0.1:' + srv.address().port;
});
test.after(async () => { await new Promise(resolve => srv.close(resolve)); await rm(assetRoot,{recursive:true,force:true}); });
async function run(action, inputs) {
  return fetch(url+'/api/run', {method:'POST', headers:{'content-type':'application/json'},body:JSON.stringify({action,inputs})});
}
test('serves branded application with no unsafe inline scripts',async()=>{
  const p=await fetch(url); const html=await p.text();
  assert.equal(p.status,200); assert.match(html,/ÆtherForge/);
  assert.match(p.headers.get('content-security-policy'),/script-src 'self'/);
});
test('catalog is based on actual maintained library capabilities', async()=>{
  const v=await (await fetch(url+'/api/modules')).json();
  assert.ok(v.modules.length >= 8); assert.ok(v.modules.some(m=>m.id==='runtime'));
});
test('command-center summary exposes only truthful local capabilities',async()=>{
  const v=await(await fetch(url+'/api/workbench/summary')).json();
  assert.equal(v.source,'maintained-library');
  assert.equal(v.boundary.cloudMutations,false);
  assert.equal(v.boundary.aiProvider,false);
  assert.equal(v.boundary.localAdapterOnly,true);
  assert.ok(v.quickActions.some(x=>x.id==='studio'));
  assert.ok(v.quickActions.some(x=>x.id==='evidence'));
});
test('application source declares the purposeful command-center surfaces',async()=>{
  const js=await(await fetch(url+'/app.js')).text();
  assert.match(js,/data-quick-action/);
  assert.match(js,/activity-feed/);
  assert.match(js,/module-filter/);
  assert.match(js,/data-studio-action/);
});
test('all six optimized reference files are served and inventoried',async()=>{const v=await(await fetch(url+'/assets/reference-manifest.json')).json();assert.equal(v.sources.length,6);for(const name of ['app-icon','brand-identity-board','desktop-ui-concept','mobile-ui-concept','orbit-emblem','primary-logo']){const response=await fetch(url+'/assets/references/'+name+'.webp');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');assert.ok((await response.arrayBuffer()).byteLength>1000);}});
test('cloud path plans but never executes', async()=>{
  const v=await (await run('cloud',{serviceName:'test-project'})).json();
  assert.equal(v.executed,false); assert.equal(v.result[0],'run'); assert.equal(v.result[1],'deploy');
});
test('brush path uses maintained geometry functions',async()=>{
  const v=await(await run('brush',{brushSize:999,shape:'tri',feather:99,distance:120})).json();
  assert.equal(v.result.brushSize,220); assert.equal(v.result.feather,80); assert.equal(v.result.shape,'tri');
});
test('bad requests are refused',async()=>{
  const invalid=await run('cloud',{});
  assert.equal(invalid.status,422);
  const invalidAction=await run('start-deployment',{});
  assert.equal(invalidAction.status,422);
  assert.equal((await fetch(url+'/src/index.js')).status,404);
});
test('verified evidence is fail-closed',async()=>{
  const v=await(await run('receipt',{receipt:{accepted:true},receiptFingerprint:'invalid'})).json();
  assert.equal(v.result.status,'rejected');
});
test('efficiency uses actual maintained calculation',async()=>{
  const v=await(await run('energy',{durationMs:1000,estimatedEnergyWh:2,renewableRatio:.5})).json();
  assert.equal(v.result.energyPerSecondWh,2);
  assert.equal(v.result.renewableAdjustedEnergyWh,1);
});
test('holo plan is advisory and yields evidence',async()=>{
  const r=await(await run('holo',{snapshotId:'test',provenanceRef:'reference-01',intent:'test visualization'})).json();
  assert.equal(r.advisoryOnly,true); assert.equal(r.result.scene.safety.physicalActuation,false);
});
test('local image uploads validate signatures and persist between requests',async()=>{
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==','base64');
 const result=await fetch(url+'/api/assets/upload',{method:'POST',headers:{'content-type':'image/png','x-file-name':'brand-icon.png'},body:bytes});
 assert.equal(result.status,201);const json=await result.json();
 assert.equal(json.asset.name,'brand-icon.png');
 const persisted=await(await fetch(url+'/api/assets')).json();
 assert.equal(persisted.assets.length,1);
 const img=await fetch(url+json.asset.url); assert.equal(img.status,200); assert.equal(img.headers.get('content-type'),'image/png');
 const invalid=await fetch(url+'/api/assets/upload',{method:'POST',headers:{'content-type':'image/png','x-file-name':'fake.png'},body:Buffer.from('not a PNG')});
 assert.equal(invalid.status,415);
 assert.equal((await fetch(url+'/api/assets/../../server.mjs')).status,404);
});
