import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createWorkbenchServer } from './server.mjs';
let srv, url;
test.before(async () => {
  srv = createWorkbenchServer();
  srv.listen(0,'127.0.0.1');
  await once(srv,'listening');
  url = 'http://127.0.0.1:' + srv.address().port;
});
test.after(async () => { await new Promise(resolve => srv.close(resolve)); });
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
