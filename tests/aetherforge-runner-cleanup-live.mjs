// Run only after the operator-approved Distroless images have been preloaded.
// This script is a CI acceptance probe, never part of browser startup.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {runIsolated,runIsolatedProject} from '../apps/aetherforge-commercial/isolated-runner.mjs';

const probes=[
  ['Node deadline',()=>runIsolated({language:'node',code:'setInterval(()=>{},1000)'})],
  ['Python project deadline',()=>runIsolatedProject({language:'python',entry:'main.py',files:{'main.py':'while True:\n pass\n'}})],
  ['Output overflow',()=>runIsolated({language:'node',code:"for(;;)process.stdout.write('x'.repeat(1024))"})],
];
for(const [label,run] of probes){
  const result=await run();
  assert.equal(result.terminated,true,label+': '+JSON.stringify(result));
  assert.equal(result.status,'terminated',label);
  assert.equal(result.cleanup.confirmed,true,label);
  assert.ok(result.stdout.length+result.stderr.length<=24000,label);
  const absent=spawnSync('docker',['ps','--all','--quiet','--filter',`name=^/${result.sandboxId}$`],{encoding:'utf8',timeout:5000});
  assert.equal(absent.status,0,absent.stderr);
  assert.equal(absent.stdout.trim(),'','Container remains after '+label);
  console.log('PASS '+label+': daemon container removed');
}
const recovered=await runIsolated({language:'node',code:"console.log('CLEANUP_RECOVERY_OK')"});
assert.equal(recovered.status,'completed',JSON.stringify(recovered));
assert.equal(recovered.cleanup.confirmed,true);
assert.match(recovered.stdout,/CLEANUP_RECOVERY_OK/u);
console.log('PASS subsequent sandbox execution after cleanup');
