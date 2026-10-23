import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const MIME = new Map([
 ['image/png', { ext:'png', matches:b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) }],
 ['image/jpeg', { ext:'jpg', matches:b=>b.length>=3&&b.subarray(0,3).equals(Buffer.from('ffd8ff','hex')) }],
 ['image/webp', { ext:'webp', matches:b=>b.length>=12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP' }]
]);
const ID=/^[a-f0-9]{64}\.(?:png|jpg|webp)$/;
function safeName(value){const s=String(value||'asset').replace(/[/\\\u0000-\u001f\u007f]/g,'_').trim();return s.slice(0,120)||'asset';}
export async function saveLocalAsset(dir, bytes, name, mime){
 if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>6*1024*1024)throw new TypeError('File must be 1 byte to 6 MiB');
 const spec=MIME.get(mime);
 if(!spec||!spec.matches(bytes))throw new TypeError('Unsupported or mismatched file format');
 const id=createHash('sha256').update(bytes).digest('hex')+'.'+spec.ext;
 const meta={id,name:safeName(name),mimeType:mime,size:bytes.length,stored:'local-only'};
 await mkdir(dir,{recursive:true,mode:0o700});
 try{await writeFile(join(dir,id),bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 await writeFile(join(dir,id+'.json'),JSON.stringify(meta),{mode:0o600});
 return {...meta,url:'/api/assets/'+id};
}
export async function listLocalAssets(dir){
 let names=[];try{names=await readdir(dir);}catch(e){if(e.code==='ENOENT')return [];throw e;}
 const valid=names.filter(n=>ID.test(n)).slice(0,200);
 const found=await Promise.all(valid.map(async n=>{
  try{const content=await readFile(join(dir,n+'.json'),'utf8');const meta=JSON.parse(content);return meta.id===n?{...meta,url:'/api/assets/'+n}:null;}catch{return null;}
 }));
 return found.filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
}
export async function getLocalAsset(dir,id){
 if(!ID.test(id))throw new TypeError('Invalid asset ID');
 const spec=[...MIME].find(([,v])=>id.endsWith('.'+v.ext));
 if(!spec)throw new TypeError('Unsupported asset ID');
 return {bytes:await readFile(join(dir,id)),mime:spec[0]};
}
