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
  const guide=await readFile(join(output,'START-HERE.md'),'utf8');
  assert.match(guide,/private Codespaces port 4546/);
  assert.ok(guide.includes('```bash'),'Markdown shell code fences must render as text');
  assert.ok(guide.includes('`file:\/\/`'),'Document the file-protocol runtime boundary');
  assert.ok(guide.includes('`node apps\/aetherforge-workbench\/server.mjs`'),'Companion startup must remain documented');
 }finally{await rm(temp,{recursive:true,force:true})}
});
test('refuses output overlapping checked-out repository',async()=>{
 await assert.rejects(buildCommercialPackage('apps/aetherforge-commercial/inside-repo'),/must not overlap repository/);
});

test('excludes real injected private state from a used checkout', async () => {
 const temp=await mkdtemp(join(tmpdir(),'aetherforge-used-checkout-'));
 try {
  const {cp}=await import('node:fs/promises');
  const source=join(temp,'checkout');await mkdir(source);
  const repo=new URL('../',import.meta.url);
  for(const path of ['apps','src','.devcontainer','docs','tools'])await cp(new URL(path,repo),join(source,path),{recursive:true});
  for(const path of ['apps/aetherforge-commercial/.local-workspaces/private.json','apps/aetherforge-commercial/.local-assets/private.png','apps/aetherforge-workbench/.local-assets/private.png','apps/aetherforge-commercial/.env.production','apps/aetherforge-commercial/logs/runtime.txt']) {
   await mkdir(join(source,path,'..'),{recursive:true});await writeFile(join(source,path),'private fixture');
  }
  const {manifest}=await buildCommercialPackage(join(temp,'bundle'),{root:source});
  assert.ok(!manifest.files.some(file=>/\.local-|\.env|\/logs\//u.test(file.path)));
  assert.ok(manifest.files.some(file=>file.path==='apps/aetherforge-commercial/workspace-store.mjs'));
 }finally{await rm(temp,{recursive:true,force:true})}
});

test('extracted launcher graph points to included servers and no absent root launcher',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'aetherforge-launcher-graph-'));
 try{
  const output=join(temp,'bundle');await buildCommercialPackage(output);
  const root=await readFile(join(output,'AETHERFORGE.cmd'),'utf8');
  const commercial=await readFile(join(output,'apps/aetherforge-commercial/launch-aetherforge.cmd'),'utf8');
  const shared=await readFile(join(output,'apps/aetherforge-workbench/launch-aetherforge.cmd'),'utf8');
  assert.match(root,/apps\\aetherforge-commercial\\launch-aetherforge\.cmd/u);
  assert.match(commercial,/AETHERFORGE_LAUNCH_APP=commercial/u);
  assert.match(commercial,/\.\.\\aetherforge-workbench\\launch-aetherforge\.cmd/u);
  assert.match(shared,/aetherforge-commercial\\server\.mjs/u);
  assert.match(shared,/AETHERFORGE_PORT=4546/u);
  assert.match(shared,/runtime\\node\.exe/u);
  assert.ok(!commercial.includes('..\\..\\AETHERFORGE.cmd'),'Must not recurse through or depend on a missing root launcher');
  await readFile(join(output,'apps/aetherforge-commercial/server.mjs'));
  await readFile(join(output,'apps/aetherforge-workbench/server.mjs'));
 }finally{await rm(temp,{recursive:true,force:true})}
});
