import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWorkbenchServer} from '../apps/aetherforge-commercial/server.mjs';
const makeProject=()=>({schemaVersion:1,name:'Persistent commercial project',revision:4,entry:'src/index.html',files:{
 'src/index.html':'<h1>Persisted source</h1>',
 'src/styles.css':'body { color: teal }',
 'src/script.js':'console.log("Stored")',
 'scripts/run.py':'print("Stored safely")'
}});
async function setup(){
 const dir=await mkdtemp(join(tmpdir(),'aetherforge-persistence-')),server=createWorkbenchServer({assetRoot:join(dir,'assets'),workspaceRoot:join(dir,'workspace')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {dir,server,base:'http://127.0.0.1:'+server.address().port,close:async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}};
}
test('project PUT, list and GET round-trip all source files',async()=>{
 const ctx=await setup();try{
  const id='acceptance_123',p=makeProject();
  const save=await fetch(ctx.base+'/api/workspace/projects/'+id,{method:'PUT',headers:{'content-type':'application/json','x-aetherforge-local':'1'},body:JSON.stringify(p)});
  assert.equal(save.status,200,await save.text());
  const list=await fetch(ctx.base+'/api/workspace/projects').then(r=>r.json());
  assert.ok(list.projects.some(x=>x.id===id&&x.fileCount===4&&x.revision===4));
  const loaded=await fetch(ctx.base+'/api/workspace/projects/'+id);
  assert.equal(loaded.status,200);
  const data=await loaded.json();
  assert.deepEqual(data.project.files,p.files);
  assert.equal(data.project.entry,p.entry);
  assert.equal(data.project.name,p.name);
 }finally{await ctx.close()}
});
test('workspace API rejects foreign origins and invalid project paths',async()=>{
 const ctx=await setup();try{
  const p=makeProject();
  const headers={'content-type':'application/json','x-aetherforge-local':'1'};
  assert.equal((await fetch(ctx.base+'/api/workspace/projects/rejected',{method:'PUT',headers:{...headers,origin:'https://outside.invalid'},body:JSON.stringify(p)})).status,403);
  assert.equal((await fetch(ctx.base+'/api/workspace/projects/rejected',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(p)})).status,415);
  const bad=makeProject();bad.files['../secret.txt']='No traversal';
  assert.equal((await fetch(ctx.base+'/api/workspace/projects/rejected',{method:'PUT',headers,body:JSON.stringify(bad)})).status,422);
  assert.equal((await fetch(ctx.base+'/api/workspace/projects/unknown')).status,404);
 }finally{await ctx.close()}
});
