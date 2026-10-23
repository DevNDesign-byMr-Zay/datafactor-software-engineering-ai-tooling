import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const file = name => readFileSync(new URL('../apps/aetherforge-commercial/'+name, import.meta.url), 'utf8');
function supported(location){const window={};runInNewContext(file('cloud-backend.js'),{window});return window.AetherForgeCloud.isSupportedOrigin(location);}
test('IDE accepts private Codespaces port 4546 and localhost',()=>{
 for(const hostname of ['localhost','127.0.0.1'])assert.equal(supported({protocol:'http:',hostname}),true);
 assert.equal(supported({protocol:'https:',hostname:'reimagined-computing-machine-5g946qwwj5w5hpr-4546.app.github.dev'}),true);
 assert.match(file('engineering-ide.js'),/AetherForgeCloud\?\.isSupportedOrigin\(location\)/);
 assert.match(file('index.html'),/cloud-backend\.js/);
 assert.match(file('server.mjs'),/\['\/cloud-backend\.js'/);
});
test('IDE rejects arbitrary domains and incorrect forward ports',()=>{
 for(const loc of [
  {protocol:'file:',hostname:''},{protocol:'https:',hostname:'evil.example'},
  {protocol:'https:',hostname:'a-4545.app.github.dev'},
  {protocol:'https:',hostname:'a-4546.app.github.dev.evil.invalid'},
  {protocol:'http:',hostname:'a-4546.app.github.dev'},
  {protocol:'http:',hostname:'192.168.1.20'}
 ])assert.equal(supported(loc),false,JSON.stringify(loc));
});
test('opaque iframe uses trusted inline bridge and retains restrictive CSP',()=>{
 const frame=file('sandbox-frame.html'),bridge=file('sandbox-frame.js');
 assert.match(file('engineering-ide.js'),/sandbox="allow-scripts"/);
 assert.doesNotMatch(frame,/src="\.\/sandbox-frame\.js"/);
 assert.ok(frame.includes(bridge.trim()));
 assert.match(frame,/connect-src 'none'/);
 assert.doesNotMatch(file('engineering-ide.js'),/allow-same-origin/);
});
test('sticky topbar is opaque and switching sections resets scroll',()=>{
 assert.match(file('app.js'),/window\.scrollTo\(0,0\);render\(\)/);
 assert.match(file('engineering-ide.css'),/\.topbar \{ background:#071427; backdrop-filter:none; \}/);
});
