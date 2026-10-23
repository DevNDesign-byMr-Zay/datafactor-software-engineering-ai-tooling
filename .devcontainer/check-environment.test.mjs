import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEnvironment,summarizeEnvironment } from './check-environment.mjs';

function mock({commercial=true,companion=true,images=true,docker=true}={}){
  return checkEnvironment({
    codespaces:'true',nodeVersion:'v22.23.3',
    request:async url=>({
      ok:(url.includes('4546')?commercial:companion),
      status:503,
      json:async()=>url.includes('4546')
        ? {adapter:'ready',product:'aetherforge',version:'1.5.0-cloud',projectPersistence:true}
        : {adapter:'ready'},
    }),
    run:(cmd,args)=>{
      if(cmd!=='docker')throw Error('unexpected command');
      if(args[0]==='info'&&!docker)throw Error('not running');
      if(args[0]==='image'&&!images)throw Error('missing');
      return args[0]==='info'?'29.9.2':'sha256:ready';
    }
  });
}
test('commercial ready while optional companion port 4545 is stopped',async()=>{
  const rows=await mock({companion:false});
  assert.equal(rows.find(x=>x.name==='commercial-health').status,'PASS');
  assert.equal(rows.find(x=>x.name==='companion-health').status,'OPTIONAL');
  assert.equal(summarizeEnvironment(rows).ready,true);
  assert.deepEqual(summarizeEnvironment(rows).missingImages,[]);
});
test('commercial port failure is a required blocked check',async()=>{
  const rows=await mock({commercial:false});
  assert.deepEqual(summarizeEnvironment(rows).blocked,['commercial-health']);
  assert.equal(summarizeEnvironment(rows).ready,false);
});
test('image blockers are reported only when missing, not for stopped companion',async()=>{
  const rows=await mock({companion:false,images:false});
  assert.deepEqual(summarizeEnvironment(rows).missingImages,['node-image','python-image']);
  assert.ok(rows.some(x=>x.detail.includes('docker pull gcr.io/distroless/')));
});
test('Docker daemon down blocks container execution, even when UI is healthy',async()=>{
  const rows=await mock({docker:false});
  assert.ok(summarizeEnvironment(rows).blocked.includes('docker-daemon'));
});
