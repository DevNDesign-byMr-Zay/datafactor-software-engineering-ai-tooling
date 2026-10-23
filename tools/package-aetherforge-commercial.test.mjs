import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildCommercialPackage,RELEASE_TAG} from './package-aetherforge-commercial.mjs';

test('builds standalone commercial source bundle with no user state',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'aetherforge-release-test-'));
 try{
  const output=join(temp,'source');
  const {manifest}=await buildCommercialPackage(output);
  assert.equal(manifest.release,RELEASE_TAG);
  for(const expected of ['START-HERE.md','package.json','apps/aetherforge-commercial/index.html','apps/aetherforge-commercial/server.mjs','apps/aetherforge-workbench/server.mjs','src/index.js','.devcontainer/start-all.sh']){
   assert.ok(manifest.files.some(x=>x.path===expected),expected);
  }
  assert.ok(manifest.fileCount>50);
  assert.ok(!manifest.files.some(x=>/\/\.local-assets|\/\.local-workspaces|\/node_modules\/|\/\.aetherforge|\/\.env(?:\.|$)/.test(x.path)));
  const saved=JSON.parse(await readFile(join(output,'SOURCE-SHA256.json'),'utf8'));
  assert.equal(saved.fileCount,manifest.fileCount);
  assert.match(await readFile(join(output,'START-HERE.md'),'utf8'),/private Codespaces port 4546/);
 }finally{await rm(temp,{recursive:true,force:true})}
});
test('refuses output overlapping checked-out repository',async()=>{
 await assert.rejects(buildCommercialPackage('apps/aetherforge-commercial/inside-repo'),/must not overlap repository/);
});
