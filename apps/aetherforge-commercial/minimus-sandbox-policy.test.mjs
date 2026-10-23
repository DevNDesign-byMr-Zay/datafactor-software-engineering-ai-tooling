import test from 'node:test';
import assert from 'node:assert/strict';
import {MINIMUS_IMAGES,MINIMUS_POLICY,sandboxDockerArgs} from './minimus-sandbox-policy.mjs';

test('approved Minimus images are major-line pinned',()=>{
  assert.deepEqual(Object.keys(MINIMUS_IMAGES),['node','python']);
  assert.equal(MINIMUS_IMAGES.node,'reg.mini.dev/node:22');
  assert.equal(MINIMUS_IMAGES.python,'reg.mini.dev/python:3.13');
});
test('the sandbox requires no networking, host mounts, or automatic image pulls',()=>{
  for(const name of Object.keys(MINIMUS_IMAGES)){
    const args=sandboxDockerArgs(name,[name==='node'?'node':'python','--version']);
    for(const flag of ['--network=none','--read-only','--pull=never','--cap-drop=ALL','--security-opt=no-new-privileges']) assert.ok(args.includes(flag));
    assert.ok(!args.includes('--mount')&&!args.includes('-v'));
    assert.ok(args.includes('--user=65534:65534'));
    assert.ok(args.includes(MINIMUS_POLICY.tmpfs));
  }
});
test('unknown runtimes and malformed commands fail closed',()=>{
  assert.throws(()=>sandboxDockerArgs('shell',['sh']));
  assert.throws(()=>sandboxDockerArgs('node',[]));
  assert.throws(()=>sandboxDockerArgs('node',['']));
});
