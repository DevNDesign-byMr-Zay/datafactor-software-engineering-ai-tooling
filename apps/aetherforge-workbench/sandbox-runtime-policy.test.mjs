import test from 'node:test';
import assert from 'node:assert/strict';
import { SANDBOX_IMAGES, SANDBOX_POLICY, sandboxDockerArgs } from './sandbox-runtime-policy.mjs';

test('supported public Distroless Node 22 and Python 3.13 runtimes', () => {
 assert.deepEqual(Object.keys(SANDBOX_IMAGES), ['node','python']);
 assert.equal(SANDBOX_IMAGES.node, 'gcr.io/distroless/nodejs22-debian13:nonroot');
 assert.equal(SANDBOX_IMAGES.python, 'gcr.io/distroless/python3-debian13:nonroot');
});
test('Docker restrictions and distroless entrypoint argument ordering', () => {
 for (const [name, cmd] of [['node',['node','-e','console.log(1)']],['python',['python','-c','print(1)']]]) {
  const args = sandboxDockerArgs(name,cmd);
  for(const f of ['--pull=never','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges']) assert.ok(args.includes(f));
  assert.equal(args.at(-2), cmd[1]);
  assert.equal(args.at(-1), cmd[2]);
  assert.equal(args[args.indexOf(SANDBOX_IMAGES[name])+1],cmd[1]);
  assert.ok(args.includes(SANDBOX_POLICY.tmpfs));
  assert.ok(!args.includes('--mount')&&!args.includes('-v'));
 }
});
test('unexpected runtime and malformed command fail closed', () => {
 for (const [name,cmd] of [['bash',['bash','-c','pwd']],['node',['python','-c','hi']],['node',[]],['node',['node','']],['python',['python']]]) assert.throws(()=>sandboxDockerArgs(name,cmd));
});
