import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkbenchServer } from '../apps/aetherforge-commercial/server.mjs';
import { RUNTIMES, runIsolatedProject, validateRunnableProject } from '../apps/aetherforge-commercial/isolated-runner.mjs';
import { sandboxDockerArgs } from '../apps/aetherforge-commercial/minimus-sandbox-policy.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { request as httpRequest } from 'node:http';
function rawStatus(url,headers={}){return new Promise((resolve,reject)=>{const req=httpRequest(url,{headers},res=>{res.resume();res.once('end',()=>resolve(res.statusCode))});req.once('error',reject);req.end();});}

test('approved Distroless container entrypoints, no host mounts',()=>{
 for (const [language,exec,flag] of [['node','node','-e'],['python','python','-c']]) {
  const args=sandboxDockerArgs(language,[exec,flag,'print(1)']);
  const image=RUNTIMES[language].image;
  assert.equal(args[args.indexOf(image)+1], flag);
  assert.ok(image.startsWith('gcr.io/distroless/'));
  for (const f of ['--network=none','--read-only','--pull=never','--cap-drop=ALL','--security-opt=no-new-privileges','--user=65534:65534']) assert.ok(args.includes(f));
  assert.ok(!args.includes('--mount')&&!args.includes('-v'));
 }
});

test('project execution never falls back to host interpreter',async()=>{
 let called=false; let body='';let actualArgs;
 function fake(command,args,options){
  called=true;actualArgs=args;assert.equal(command,'docker');assert.equal(options.shell,false);
  const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
  child.stdin=new Writable({write(chunk,enc,done){body+=chunk.toString('utf8');done()},final(done){done();queueMicrotask(()=>child.emit('close',0))}});
  child.kill=()=>{};
  return child;
 }
 const sample={language:'python',entry:'main.py',files:{'main.py':'print(42)'}};
 const result=await runIsolatedProject(sample,{spawnImpl:fake});
 assert.ok(called);assert.equal(result.status,'completed');assert.ok(actualArgs.includes('--pull=never'));
 assert.deepEqual(JSON.parse(body).files,sample.files);
 assert.throws(()=>validateRunnableProject({...sample,entry:'../etc/passwd'}));
});

test('commercial server local health, host and cross-origin protections',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'aetherforge-cloud-test-'));
 const server=createWorkbenchServer({assetRoot:join(dir,'assets'),workspaceRoot:join(dir,'workspace')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const health=await fetch(base+'/api/health');assert.equal(health.status,200);
  assert.equal((await health.json()).version,'1.5.0-cloud');
  assert.equal(await rawStatus(base+'/',{host:'attacker.evil'}),403);
  assert.equal((await fetch(base+'/api/health',{headers:{origin:'https://other.example'}})).status,403);
  const ui=await fetch(base+'/engineering-ide.js');assert.equal(ui.status,200);
  const noConfirmation=await fetch(base+'/api/execution/run',{method:'POST',headers:{'content-type':'application/json','x-aetherforge-local':'1'},body:JSON.stringify({language:'node',code:'console.log(1)'})});
  assert.equal(noConfirmation.status,422);
 } finally {await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});

test('Codespaces forward host must match exactly and require HTTPS origin',async()=>{
 const oldA=process.env.CODESPACES,oldB=process.env.CODESPACE_NAME,oldC=process.env.AETHERFORGE_PORT;
 process.env.CODESPACES='true';process.env.CODESPACE_NAME='example-codespace';process.env.AETHERFORGE_PORT='4546';
 const server=createWorkbenchServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`, host='example-codespace-4546.app.github.dev';
 try{
  assert.equal(await rawStatus(base+'/api/health',{host,origin:'https://'+host}),200);
  assert.equal(await rawStatus(base+'/api/health',{host,origin:'http://'+host}),403);
  assert.equal(await rawStatus(base+'/api/health',{host:'different-4546.app.github.dev',origin:'https://'+host}),403);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  for(const [key,value] of [['CODESPACES',oldA],['CODESPACE_NAME',oldB],['AETHERFORGE_PORT',oldC]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
