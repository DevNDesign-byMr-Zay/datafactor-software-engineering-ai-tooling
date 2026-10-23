import test from 'node:test';
import assert from 'node:assert/strict';
import {findCommercialPids} from './stop-commercial.mjs';
test('restart selects only exact commercial server, never companion or arbitrary node',()=>{
 const table=[
 '  12 node apps/aetherforge-workbench/server.mjs',
 '  13 node apps/aetherforge-commercial/server.mjs',
 '  14 node app.js',
 '  15 sh -c node apps/aetherforge-commercial/server.mjs',
 '  16 /usr/local/bin/node apps/aetherforge-commercial/server.mjs'
 ].join('\n');
 assert.deepEqual(findCommercialPids(table),[13,16]);
});
test('restart rejects accidental broad argument matches',()=>{
 assert.deepEqual(findCommercialPids('  99 node apps/aetherforge-commercial/server.mjs --somearg\n  12 node apps/aetherforge-commercial/evil.mjs'),[]);
});
