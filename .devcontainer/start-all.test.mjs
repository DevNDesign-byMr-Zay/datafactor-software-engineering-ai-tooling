import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const src=readFileSync(new URL('./start-all.sh',import.meta.url),'utf8');
test('single-command launcher syntax and explicit Codespaces restriction',()=>{
 const r=spawnSync('bash',['-n'],{input:src,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 assert.match(src,/CODESPACES/);
 assert.match(src,/start-aetherforge\.sh/);
 assert.match(src,/start-commercial\.sh/);
 assert.match(src,/check-environment\.mjs/);
});
test('startup reuses services but never auto-downloads or runs untrusted code',()=>{
 assert.doesNotMatch(src,/docker\s+(pull|run)|git\s+(reset|checkout|clean)|curl\s+.*\|/);
 assert.doesNotMatch(src,/rm\s+-rf|git\s+push/);
 assert.match(src,/Keep both ports Private/);
 assert.match(src,/--restart/);
});
