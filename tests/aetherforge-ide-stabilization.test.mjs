import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=name=>readFileSync(new URL('../apps/aetherforge-commercial/'+name,import.meta.url),'utf8');
function load(){
 const root={},context={window:root,TextEncoder,TextDecoder,Uint8Array,DataView,ArrayBuffer,console};
 runInNewContext(source('ide-core.js'),context,{timeout:2000});
 runInNewContext(source('project-zip-core.js'),context,{timeout:2000});
 return {ide:root.AetherForgeIDECore,zip:root.AetherForgeProjectZip};
}
test('full editable project ZIP round-trip preserves multiple source paths and content',()=>{
 const {ide,zip}=load(),project=ide.starter();
 project.name='Commercial cloud acceptance';
 project.files['src/app.js']='export const greeting = "ÆTHERFORGE";';
 project.files['nested/index.html']='<main>SECOND DOCUMENT</main>';
 project.files['src/style.css']='h1 { color: cyan }';
 const binary=zip.exportProject(project,ide.validate);
 const restored=zip.importProject(binary,ide.validate,'fallback');
 assert.equal(restored.name,project.name);
 assert.equal(restored.entry,project.entry);
 assert.equal(restored.files['src/app.js'],project.files['src/app.js']);
 assert.equal(restored.files['nested/index.html'],project.files['nested/index.html']);
 assert.equal(restored.files['src/style.css'],project.files['src/style.css']);
 assert.equal(Object.keys(restored.files).length,Object.keys(project.files).length);
});
test('project export/import remains source-only with no auto-execution',()=>{
 const {ide,zip}=load();
 const project=ide.starter();
 project.files['script.js']='throw new Error("DO NOT EXECUTE");';
 const restored=zip.importProject(zip.exportProject(project,ide.validate),ide.validate);
 assert.match(restored.files['script.js'],/DO NOT EXECUTE/);
 assert.equal(restored.entry,'index.html');
});
test('ZIP importer rejects damaged CRC and unsafe/unsupported content',()=>{
 const {ide,zip}=load();
 const bytes=zip.exportProject(ide.starter(),ide.validate);
 bytes[bytes.length-28]^=1;
 assert.throws(()=>zip.importProject(bytes,ide.validate),/CRC|ZIP|Invalid|Damaged|offset|directory|header/);
});
test('project editor preview selects the requested HTML and keeps linked source distinct',()=>{
 const {ide}=load(),p=ide.starter();
 p.files['imports/index.html']='<h2>Imported HTML</h2>';
 const a=ide.previewFiles(p,'imports/index.html');
 const b=ide.previewFiles(p,'index.html');
 assert.equal(a.entry,'imports/index.html');
 assert.match(a.html,/Imported HTML/);
 assert.equal(b.entry,'index.html');
 assert.doesNotMatch(b.html,/Imported HTML/);
});
test('runner defaults to selected source language and preview identifies its source',()=>{
 const s=source('engineering-ide.js'),css=source('engineering-ide.css');
 assert.match(s,/const selectedLang=\/\\.py\$\/i\.test\(active\)\?'python'/);
 assert.match(s,/selectedLang==='python'\?'selected'/);
 assert.match(s,/selectedLang==='node'\?'selected'/);
 assert.match(s,/PREVIEW: '\+f\.entry/);
 assert.match(s,/No HTML preview was started/);
 assert.match(s,/await writeRemote\(\)/);
 assert.match(css,/@media\(max-width:740px\)/);
});
