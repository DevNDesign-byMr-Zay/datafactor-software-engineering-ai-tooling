import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createWorkbenchServer} from '../apps/aetherforge-commercial/server.mjs';

test('only sandboxed preview frame permits same-origin framing and inline bridge',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'aetherforge-csp-'));
 const server=createWorkbenchServer({assetRoot:join(dir,'a'),workspaceRoot:join(dir,'w')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const frame=await fetch(base+'/sandbox-frame.html');
  assert.equal(frame.status,200);
  assert.equal(frame.headers.get('x-frame-options'),'SAMEORIGIN');
  const frameCsp=frame.headers.get('content-security-policy')||'';
  for(const clause of ["default-src 'none'","script-src 'unsafe-inline'","connect-src 'none'","frame-src 'none'","form-action 'none'","frame-ancestors 'self'"])assert.ok(frameCsp.includes(clause),'Frame missing '+clause);
  assert.match(await frame.text(),/aetherforge-sandbox-ready/);
  const host=await fetch(base+'/');
  assert.equal(host.headers.get('x-frame-options'),'DENY');
  assert.match(host.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  const api=await fetch(base+'/api/health');
  assert.equal(api.headers.get('x-frame-options'),'DENY');
  assert.match(api.headers.get('content-security-policy'),/script-src 'self'/);
  const denied=await fetch(base+'/sandbox-frame.html',{headers:{origin:'https://outside.invalid'}});
  assert.equal(denied.status,403);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})}
});
