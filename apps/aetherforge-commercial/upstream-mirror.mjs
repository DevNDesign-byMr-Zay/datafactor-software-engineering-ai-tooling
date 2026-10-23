/* Read-only, optional local GitHub source mirrors. Never executes mirrored content. */
import {readdir,readFile,realpath,stat} from 'node:fs/promises';
import {join,relative,resolve,sep} from 'node:path';
const MAP=Object.freeze({'roary-corpus':'ROARY-Engineering-Corpus','roary-runtime':'ROARY-Runtime','canva-apps':'Canva-Apps'});
const TEXT=/\.(?:js|mjs|cjs|jsx|ts|tsx|py|html|css|json|md|txt|yaml|yml|toml|sh|ps1|cmd|svg|sql)$/i;
const PRIVATE=/(?:^|\/)(?:\.env(?:\.[^/]*)?|\.git|node_modules)(?:\/|$)|\.(?:pem|p12|pfx|key)$/i;
export function validRelative(path){return typeof path==='string'&&path.length<=500&&!path.startsWith('/')&&!path.includes('\\')&&!path.split('/').some(x=>x==='..'||x==='.'||!x)&&!PRIVATE.test(path);}
export async function enumerateMirrors(root,{limit=1400}={}){
 const records=[];
 for(const [id,folder] of Object.entries(MAP)){
  const home=resolve(root,folder);let base;try{base=await realpath(home);}catch{continue;}
  async function walk(dir,depth=0){if(depth>14||records.length>=limit)return;for(const e of await readdir(dir,{withFileTypes:true})){
   if(records.length>=limit)break;const full=join(dir,e.name),rel=relative(base,full).split(sep).join('/');if(!validRelative(rel)||e.name==='AETHERFORGE-UPSTREAM-COMMIT.txt')continue;
   if(e.isDirectory())await walk(full,depth+1);
   else if(e.isFile()){const s=await stat(full);records.push({repoId:id,path:rel,bytes:s.size,origin:'local-mirror'});}
  }}
  await walk(base);
 }
 return records;
}
export async function readMirrorFile(root,id,path){
 if(!Object.hasOwn(MAP,id)||!validRelative(path)||path==='AETHERFORGE-UPSTREAM-COMMIT.txt'||!TEXT.test(path))throw Error('Unsupported file');
 const base=await realpath(resolve(root,MAP[id]));const target=await realpath(join(base,path));
 if(!target.startsWith(base+sep))throw Error('Invalid path');const s=await stat(target);
 if(!s.isFile()||s.size>180000)throw Error('File too large or unavailable');
 return readFile(target,'utf8');
}
