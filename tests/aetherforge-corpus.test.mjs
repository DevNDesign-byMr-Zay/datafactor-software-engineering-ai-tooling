import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {createWorkbenchServer as commercialServer} from '../apps/aetherforge-commercial/server.mjs';
import {createWorkbenchServer as companionServer} from '../apps/aetherforge-workbench/server.mjs';
import {buildCommercialPackage} from '../tools/package-aetherforge-commercial.mjs';
import {buildWorkbenchPackage} from '../apps/aetherforge-workbench/package-workbench.mjs';

const corpus='apps/aetherforge-corpus';
const assets=['navigation.css','index.html','catalog.browser.js','catalog-core.js','viewer.js','viewer.css','manifest.json','software-engineering-ai-tooling.zip'];
const hash=b=>createHash('sha256').update(b).digest('hex');
async function loadCatalog(){
 const context={TextDecoder,atob,Uint8Array};vm.createContext(context);
 vm.runInContext(await readFile(`${corpus}/catalog.browser.js`,'utf8'),context);
 vm.runInContext(await readFile(`${corpus}/catalog-core.js`,'utf8'),context);
 return {catalog:context.AETHERFORGE_CORPUS,core:context.AetherForgeCorpusCore};
}

test('all 1,610 current Drive originals retain unique paths, IDs and exact bytes',async()=>{
 const {catalog,core}=await loadCatalog();
 const manifest=JSON.parse(await readFile(`${corpus}/manifest.json`,'utf8'));
 assert.equal(catalog.files.length,1610);assert.equal(manifest.fileCount,1610);
 assert.equal(new Set(catalog.files.map(x=>x.path.toLowerCase())).size,1610);
 assert.equal(new Set(catalog.files.map(x=>x.id)).size,1610);
 assert.equal(catalog.files.reduce((n,f)=>n+f.bytes,0),1731712);
 assert.equal(manifest.folderCount,40);
 for(const f of catalog.files){
  const bytes=Buffer.from(f.contentBase64,'base64');
  assert.equal(bytes.length,f.bytes,f.path);assert.equal(hash(bytes),f.sha256,f.path);
  assert.equal(core.text(f),bytes.toString('utf8'),f.path);
  const record=manifest.files.find(x=>x.id===f.id);
  assert.equal(record.path,f.path);assert.equal(record.sha256,f.sha256);
 }
 const archive=JSON.parse(await readFile('provenance/HISTORICAL_CORPUS_V1_2_2_MANIFEST.json','utf8'));
 assert.deepEqual(manifest.files.map(f=>f.path).sort(),archive.files.map(f=>f.path).sort());
 assert.equal(manifest.archiveDifferences.length,5);
 const result=spawnSync('python',['tools/verify-engineering-corpus.py'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);
});

test('catalog searches every file and folder without collapsing duplicate names',async()=>{
 const {catalog,core}=await loadCatalog();
 const first=core.query(catalog.files,{});
 assert.equal(first.total,1610);assert.equal(first.rows.length,60);
 const paths=new Set();
 for(let page=1;page<=first.pages;page++)for(const f of core.query(catalog.files,{page}).rows)paths.add(f.path);
 assert.equal(paths.size,1610);
 const duplicate=catalog.files.find(f=>f.path.includes('.drive-'));
 const matches=core.query(catalog.files,{q:duplicate.name});
 assert.ok(matches.total>1);assert.ok(matches.rows.some(f=>f.id===duplicate.id));
 const last=catalog.files.at(-1);assert.ok(core.query(catalog.files,{q:last.id}).rows.some(f=>f.id===last.id));
 assert.equal(core.query(catalog.files,{q:'<img onerror=alert(1)>'}).total,0);
 for(const category of new Set(catalog.files.map(x=>x.category))){
  const group=core.query(catalog.files,{category});assert.ok(group.total>0);assert.ok(group.rows.every(x=>x.category===category));
 }
});

test('Commercial Library filters to all originals and downloads the selected original bytes',async()=>{
 const handlers={},nodes={},blobs=[],stored={};
 const node=id=>nodes[id]||(nodes[id]={value:'All',innerHTML:'',focus(){},querySelectorAll(){return [];}});
 const document={
  addEventListener(type,fn){(handlers[type]||=[]).push(fn);},
  getElementById(id){return id==='toast'?null:node(id);},querySelector(){return {};},
  createElement(){return {click(){}};}
 };
 node('aflSearch').value='';node('aflOrigin').value='corpus';
 const context={TextDecoder,atob,Uint8Array,Blob,document,console,
  localStorage:{getItem:key=>stored[key]||null,setItem:(key,value)=>{stored[key]=value;}},
  URL:{createObjectURL(blob){blobs.push(blob);return 'blob:test';},revokeObjectURL(){}},
  setTimeout:fn=>{fn();return 0;},clearTimeout(){},addEventListener(){}};
 context.window=context;vm.createContext(context);
 for(const path of [`${corpus}/catalog.browser.js`,`${corpus}/catalog-core.js`,
  'apps/aetherforge-commercial/library-core.js','apps/aetherforge-commercial/source-bundle.js','apps/aetherforge-commercial/library.js']){
  vm.runInContext(await readFile(path,'utf8'),context);
 }
 const library=context.AetherForgeLibrary;
 assert.equal(library.summary().corpus,1610);assert.equal(library.getCorpus().length,1610);
 assert.equal(new Set(library.getCorpus().map(f=>f.id)).size,1610);
 assert.ok(library.getCorpus().every(f=>f.origin==='corpus'&&f.licenseStatus==='review-required'));
 for(const callback of handlers.change)callback({target:{id:'aflOrigin'}});
 assert.match(node('main').innerHTML,/Showing 1610 \/ 1768 entries/);
 assert.ok(node('main').innerHTML.includes('Original Drive reference. SHA-256:'));
 const original=context.AETHERFORGE_CORPUS.files[0];
 const click=attribute=>{for(const callback of handlers.click)callback({target:{closest:()=>({dataset:{},hasAttribute:name=>name===attribute})}});};
 click('data-afl-download');assert.equal(hash(Buffer.from(await blobs.at(-1).arrayBuffer())),original.sha256);
 click('data-afl-clone');assert.equal(library.getPersonal().length,1);
 assert.equal(library.getPersonal()[0].origin,'user');
 assert.equal(library.getPersonal()[0].content,context.AetherForgeCorpusCore.text(original));
 assert.equal(library.getCorpus().length,1610);
});

for(const [name,createServer] of [['Commercial',commercialServer],['Companion',companionServer]]){
 test(`${name} serves only the fixed reference assets with existing security headers`,async()=>{
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
   const base=`http://127.0.0.1:${server.address().port}`;
   for(const asset of assets){
    const response=await fetch(`${base}/aetherforge-corpus/${asset}`);
    assert.equal(response.status,200,asset);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await readFile(`${corpus}/${asset}`)));
   }
   assert.equal((await fetch(`${base}/aetherforge-corpus/not-listed.js`)).status,404);
   assert.equal((await fetch(`${base}/aetherforge-corpus/manifest.json`,{headers:{Origin:'https://evil.invalid'}})).status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
 });
}

for(const [name,build] of [['Commercial',buildCommercialPackage],['Companion',buildWorkbenchPackage]]){
 test(`${name} portable package contains the complete offline collection`,async()=>{
  const temporary=await mkdtemp(join(tmpdir(),'aetherforge-corpus-'));
  try{
   const output=join(temporary,'bundle');await build(output);
   for(const asset of assets)assert.equal(hash(await readFile(join(output,corpus,asset))),hash(await readFile(`${corpus}/${asset}`)),asset);
   const app=name==='Commercial'?'aetherforge-commercial':'aetherforge-workbench';
   assert.match(await readFile(join(output,'apps',app,'index.html'),'utf8'),/\.\.\/aetherforge-corpus\/index\.html/);
  }finally{await rm(temporary,{recursive:true,force:true});}
 });
}
