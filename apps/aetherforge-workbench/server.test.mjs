import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorkbenchServer } from './server.mjs';
import { classifyEvidence, nextEvidenceTab, exportEvidenceVerdict } from './evidence-center.js';
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
  assert.match(html,/app-v2\.css/);
  assert.match(html,/app-behavior\.js/);
  assert.match(html,/workspace-memory\.js/);
  assert.match(html,/command-rail\.js/);
  assert.match(html,/workflow-studio\.js/);
  assert.match(html,/workflow-studio-export\.js/);
  assert.match(html,/mobile-nav/);
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
  const guard=await(await fetch(url+'/app-behavior.js')).text();
  assert.match(js,/data-quick-action/);
  assert.match(js,/activity-feed/);
  assert.match(js,/module-filter/);
  assert.match(js,/data-studio-action/);
  assert.match(guard,/stopImmediatePropagation/);
  assert.match(guard,/globalSearch/);
});
test('workspace navigation remembers pins and recent work locally',async()=>{
  const js=await(await fetch(url+'/workspace-memory.js')).text();
  assert.match(js,/aetherforge-pinned-modules/);
  assert.match(js,/aetherforge-recent-pages/);
  assert.match(js,/workspace-memory/);
  assert.match(js,/pin-module/);
  assert.match(js,/localStorage/);
  const css=await(await fetch(url+'/app-v2.css')).text();
  assert.match(css,/\.workspace-memory/);
  assert.match(css,/\.pin-module/);
});
test('command rail provides truthful local navigation suggestions',async()=>{
  const js=await(await fetch(url+'/command-rail.js')).text();
  assert.match(js,/command-rail/);
  assert.match(js,/api\/modules/);
  assert.match(js,/Workflow Studio/);
  assert.match(js,/Module Library/);
  assert.match(js,/data-command-result/);
  const css=await(await fetch(url+'/app-v2.css')).text();
  assert.match(css,/\.command-rail/);
  assert.match(css,/\.command-result/);
});
test('Workflow Studio exposes staged validation, presets and result inspection',async()=>{
  const js=await(await fetch(url+'/workflow-studio.js')).text();
  const html=await(await fetch(url+'/')).text();
  const css=await(await fetch(url+'/app-v2.css')).text();
  assert.match(html,/workflow-studio\.js/);
  assert.match(js,/workflow-stage/);
  assert.match(js,/data-workflow-stage/);
  assert.match(js,/validateWorkflow/);
  assert.match(js,/preset-button/);
  assert.match(js,/data-preset/);
  assert.match(js,/result-tab/);
  assert.match(js,/data-result-tab/);
  assert.match(js,/workflow-history/);
  assert.match(js,/data-history-clear/);
  assert.match(css,/\.workflow-stage/);
  assert.match(css,/\.result-tab/);
  assert.match(css,/\.workflow-history/);
});
test('Workflow Studio validation blocks empty required identifiers before adapter calls',async()=>{
  const js=await(await fetch(url+'/workflow-studio.js')).text();
  assert.match(js,/required workflow input/i);
  assert.match(js,/validation-error/);
  assert.match(js,/setStage\('validate'\)/);
});
test('Workflow Studio presets populate inputs without executing workflows',async()=>{
  const js=await(await fetch(url+'/workflow-studio.js')).text();
  assert.match(js,/applyPreset/);
  assert.match(js,/dispatchEvent\(new Event\('input'/);
  assert.match(js,/executeWorkflow/);
  assert.match(js,/applyPreset\([^)]*true/);
});
test('Workflow Studio export remains scoped to the instrument result',async()=>{
  const js=await(await fetch(url+'/workflow-studio-export.js')).text();
  assert.match(js,/workflowStudioInstrument/);
  assert.match(js,/workflowOutput/);
  assert.match(js,/data-download/);
  assert.match(js,/URL\.createObjectURL/);
  assert.match(js,/aetherforge-\$\{action\}-result\.json/);
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

test('Evidence Center 2.0 serves the four-stage visual instrument', async()=>{
  const html=await(await fetch(url)).text();
  const script=await fetch(url+'/evidence-center.js');
  const css=await(await fetch(url+'/app-v2.css')).text();
  assert.match(html,/evidence-center\.js/);
  assert.equal(script.status,200);
  const source=await script.text();
  assert.match(source,/evidence-stage-rail/);
  assert.match(source,/data-evidence-tab/);
  assert.match(source,/Why this result is trusted/);
  assert.match(css,/\.evidence-instrument/);
});

test('Evidence classification remains unverified before an actual maintained-library response',()=>{
  const model=classifyEvidence(null,{accepted:true},'a'.repeat(64));
  assert.equal(model.verdict,'PENDING');
  assert.equal(model.trusted,false);
  assert.equal(model.authority,'NONE');
});

test('Evidence classification distinguishes changed evidence from deployment permission',()=>{
  const finger='a'.repeat(64);
  const prior='b'.repeat(64);
  const model=classifyEvidence(
    {status:'checked',authority:'none',result:{status:'changed',fingerprint:finger,reason:null}},
    {accepted:true,service:{name:'example'}},finger,prior
  );
  assert.equal(model.verdict,'CHANGED');
  assert.equal(model.trusted,true);
  assert.equal(model.authority,'NONE');
  assert.equal(model.checks.find(x=>x.id==='fingerprint').state,'verified');
  assert.equal(model.checks.find(x=>x.id==='comparison').state,'verified');
  assert.match(model.explanation,/not proof of source authenticity/i);
});

test('Evidence classification marks unchanged only when fingerprints agree',()=>{
  const finger='c'.repeat(64);
  const model=classifyEvidence(
    {status:'checked',authority:'none',result:{status:'unchanged',fingerprint:finger,reason:null}},
    {accepted:true},finger,finger
  );
  assert.equal(model.verdict,'UNCHANGED');
  assert.equal(model.trusted,true);
});

test('Evidence classification fails closed for rejected or inconsistent verifier results',()=>{
  const finger='d'.repeat(64);
  const receipt={accepted:true};
  const rejected=classifyEvidence(
    {status:'checked',authority:'none',result:{status:'rejected',fingerprint:null,reason:'receipt fingerprint mismatch'}},
    receipt,finger
  );
  assert.equal(rejected.verdict,'REJECTED');
  assert.equal(rejected.trusted,false);
  assert.match(rejected.reason,/mismatch/);
  assert.notEqual(rejected.checks.find(x=>x.id==='fingerprint').state,'verified');
  const inconsistent=classifyEvidence(
    {status:'checked',authority:'deployment',result:{status:'unchanged',fingerprint:finger,reason:null}},
    receipt,finger,'e'.repeat(64)
  );
  assert.equal(inconsistent.verdict,'REJECTED');
  assert.equal(inconsistent.trusted,false);
});

test('Evidence inspector supports circular keyboard tab navigation',()=>{
  assert.equal(nextEvidenceTab('decision',1),'receipt');
  assert.equal(nextEvidenceTab('raw',1),'decision');
  assert.equal(nextEvidenceTab('decision',-1),'raw');
});

test('Evidence verdict export preserves the lineage but not private receipt contents',()=>{
  const fingerprint='f'.repeat(64);
  const payload={status:'checked',authority:'none',result:{status:'changed',fingerprint,reason:null}};
  const model=classifyEvidence(payload,{accepted:true,secret:'not-for-export'},fingerprint);
  const exported=exportEvidenceVerdict(payload,model);
  assert.equal(exported.currentFingerprint,fingerprint);
  assert.equal(exported.previousFingerprint,null);
  assert.equal(exported.decision.verdict,'CHANGED');
  assert.equal(exported.decision.authority,'none');
  assert.equal(JSON.stringify(exported).includes('not-for-export'),false);
  assert.equal(Object.hasOwn(exported,'receipt'),false);
});

test('Evidence inspector explicitly displays fingerprint lineage and cancels stale input',async()=>{
  const src=await(await fetch(url+'/evidence-center.js')).text();
  const css=await(await fetch(url+'/app-v2.css')).text();
  assert.match(src,/evidence-lineage/);
  assert.match(src,/pendingVersion\+\+/);
  assert.match(src,/button\.disabled=false/);
  assert.match(css,/\.evidence-lineage/);
});
