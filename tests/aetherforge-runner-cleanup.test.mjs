import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough, Writable} from 'node:stream';
import {runIsolated, runIsolatedProject} from '../apps/aetherforge-commercial/isolated-runner.mjs';

function transport({overflow=false, cleanupFailure=false, removedAlready=false}={}) {
  const calls=[];
  function spawn(command,args,options) {
    assert.equal(command,'docker');
    assert.equal(options.shell,false);
    calls.push(args);
    const child=new EventEmitter();
    child.stdout=new PassThrough();child.stderr=new PassThrough();
    child.kill=()=>{queueMicrotask(()=>child.emit('close',null));return true;};
    child.stdin=new Writable({write(_chunk,_encoding,done){done();},final(done){
      done();queueMicrotask(()=>{
        if(args[0]==='run'&&overflow){
          child.stdout.emit('data',Buffer.alloc(23000,65));
          child.stderr.emit('data',Buffer.alloc(23000,66));
        } else if(args[0]==='rm') {
          child.emit('close',cleanupFailure||removedAlready?1:0);
        } else if(args[0]==='ps') {
          if(cleanupFailure)child.stderr.emit('data','daemon unavailable');
          child.emit('close',cleanupFailure?1:0);
        } else child.emit('close',0);
      });
    }});
    return child;
  }
  return {calls,spawn};
}

test('output overflow removes only its own named container and bounds combined output',async()=>{
  const fake=transport({overflow:true});
  const result=await runIsolated({language:'node',code:'console.log(1)'},{spawnImpl:fake.spawn});
  assert.equal(result.status,'terminated');
  assert.equal(result.terminated,true);
  assert.ok(result.stdout.length+result.stderr.length<=24000);
  assert.match(result.sandboxId,/^aetherforge-[a-f0-9-]{36}$/u);
  assert.equal(fake.calls[0][fake.calls[0].indexOf('--name')+1],result.sandboxId);
  assert.deepEqual(fake.calls[1],['rm','--force',result.sandboxId]);
  assert.equal(result.cleanup.confirmed,true);
});

test('cleanup failure is explicit and never reported as a completed execution',async()=>{
  const fake=transport({cleanupFailure:true});
  const result=await runIsolatedProject({language:'python',entry:'main.py',files:{'main.py':'print(1)'}},{spawnImpl:fake.spawn});
  assert.equal(result.status,'failed');
  assert.equal(result.requiresOperatorAction,true);
  assert.equal(result.cleanup.confirmed,false);
  assert.deepEqual(fake.calls[2],['ps','--all','--quiet','--filter',`name=^/${result.sandboxId}$`]);
  assert.ok(!JSON.stringify(result.cleanup).includes('daemon unavailable'));
});

test('an already auto-removed container is confirmed absent before success',async()=>{
  const fake=transport({removedAlready:true});
  const result=await runIsolated({language:'node',code:'console.log(1)'},{spawnImpl:fake.spawn});
  assert.equal(result.status,'completed');
  assert.equal(result.cleanup.confirmed,true);
  assert.equal(result.requiresOperatorAction,false);
  assert.equal(fake.calls[2][0],'ps');
});
