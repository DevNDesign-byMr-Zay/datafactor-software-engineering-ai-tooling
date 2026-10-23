import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,symlink,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {enumerateState,createBackup} from './backup-commercial.mjs';
async function fixture(){
 const base=await mkdtemp(join(tmpdir(),'aetherforge-cloud-backup-'));
 const source=join(base,'data'),destination=join(base,'backup');
 await mkdir(join(source,'workspaces'),{recursive:true});
 await mkdir(join(source,'assets'),{recursive:true});
 const project='a'.repeat(64)+'.json',asset='b'.repeat(64)+'.png';
 await writeFile(join(source,'workspaces',project),'{"id":"project123","project":{"name":"Test"}}');
 await writeFile(join(source,'assets',asset),Buffer.from([137,80,78,71]));
 await writeFile(join(source,'workspaces','ignored.tmp'),'discard-me');
 return {base,source,destination,project,asset};
}
test('private cloud backup includes only server store and stored asset hashes, never temp files',async()=>{
 const f=await fixture();
 try{
  assert.deepEqual(await enumerateState(f.source),['assets/'+f.asset,'workspaces/'+f.project]);
  const result=await createBackup({sourceRoot:f.source,destinationRoot:f.destination});
  assert.equal(result.files,2);
  assert.match(result.archive,/\.tar\.gz$/);
  assert.match((await readFile(result.archive+'.sha256','utf8')),/^[a-f0-9]{64}  aetherforge-cloud-/);
 }finally{await rm(f.base,{recursive:true,force:true})}
});
test('backup rejects symbolic links and refuses unsafe source destinations',async()=>{
 const f=await fixture();
 try{
  await symlink(join(f.source,'workspaces',f.project),join(f.source,'workspaces','c'.repeat(64)+'.json'));
  await assert.rejects(enumerateState(f.source),/Unsafe state file/);
  await assert.rejects(createBackup({sourceRoot:f.source,destinationRoot:f.source}),/disjoint/);
 }finally{await rm(f.base,{recursive:true,force:true})}
});
