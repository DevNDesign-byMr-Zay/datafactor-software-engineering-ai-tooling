import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root=new URL('../',import.meta.url);
const cfg=JSON.parse(readFileSync(new URL('./devcontainer.json',import.meta.url),'utf8'));
const server=readFileSync(new URL('../apps/aetherforge-workbench/server.mjs',import.meta.url),'utf8');
test('Codespaces uses Node 22 and explicit Docker-in-Docker',()=>{
 assert.match(cfg.image,/javascript-node:22-bookworm$/);
 assert.ok(Object.hasOwn(cfg.features,'ghcr.io/devcontainers/features/docker-in-docker:4'));
 assert.equal(cfg.remoteUser,'node');
});
test('workbench private forwarding and Codespaces-guarded bind',()=>{
 assert.ok(cfg.forwardPorts.includes(4545));
 assert.equal(cfg.portsAttributes['4545'].onAutoForward,'notify');
 assert.equal(cfg.postStartCommand, undefined, 'Codespace startup must not depend on the app');
 assert.match(server,/process\.env\.CODESPACES==='true'/);
 assert.match(server,/AETHERFORGE_CODESPACES_BIND/);
});
test('no automatic image pulls or user-code execution on startup',()=>{
 const launcher=readFileSync(new URL('./start-aetherforge.sh',import.meta.url),'utf8');
 assert.doesNotMatch(launcher,/docker\s+(pull|run)|curl\s+.+\|\s*(sh|bash)/);
 assert.match(launcher,/apps\/aetherforge-workbench\/server\.mjs/);
});
