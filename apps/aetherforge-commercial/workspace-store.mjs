/* ÆTHERFORGE: persistent local-only engineering projects. Never executes imported code. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
const SAFE_PATH = /^[a-zA-Z0-9_./-]{1,180}$/;
const EXT = /\.(?:html|htm|css|scss|js|mjs|cjs|json|md|ts|tsx|jsx|py|svg|txt|xml|yml|yaml|sql|sh|ps1|cmd|java|go|rs|rb|php|vue|svelte|c|h|cpp|cs)$/i;
export const MAX_PROJECT_BYTES=1_800_000;
export function validProjectId(id){return typeof id==='string'&&ID.test(id);}
export function validateProject(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||input.schemaVersion!==1||
     typeof input.name!=='string'||!input.name.trim()||input.name.length>140||
     !input.files||typeof input.files!=='object'||Array.isArray(input.files)||
     typeof input.entry!=='string'||!Object.hasOwn(input.files,input.entry))throw new Error('Invalid project');
  const entries=Object.entries(input.files);
  if(entries.length<1||entries.length>75)throw new Error('Invalid file count');
  let total=0;
  for(const [path,contents] of entries){
    const parts=path.split('/');
    if(!SAFE_PATH.test(path)||!EXT.test(path)||parts.some(p=>!p||p==='.'||p==='..'||/^(?:\.env(?:\..*)?|credentials(?:\..*)?|id_rsa|private\.key|secrets)$/i.test(p))||
       typeof contents!=='string'||contents.length>180000)throw new Error('Invalid source path or length');
    total+=Buffer.byteLength(contents,'utf8');
  }
  if(total>1_600_000||!Number.isInteger(input.revision)||input.revision<1)throw new Error('Project exceeds limit');
  return {schemaVersion:1,name:input.name.trim(),revision:input.revision,entry:input.entry,
    files:Object.fromEntries(entries)};
}
function fileFor(dir,id){if(!validProjectId(id))throw new Error('Invalid project ID');return join(dir,createHash('sha256').update(id).digest('hex')+'.json');}
export async function putProject(dir,id,input){
  const project=validateProject(input),target=fileFor(dir,id);
  await mkdir(dir,{recursive:true,mode:0o700});
  const updatedAt=new Date().toISOString();
  const body=JSON.stringify({id,updatedAt,project});
  if(Buffer.byteLength(body)>MAX_PROJECT_BYTES)throw new Error('Project exceeds storage limit');
  const temp=target+'.'+process.pid+'.'+Math.random().toString(16).slice(2)+'.tmp';
  await writeFile(temp,body,{flag:'wx',mode:0o600});
  await rename(temp,target);
  return {id,updatedAt,name:project.name,revision:project.revision,fileCount:Object.keys(project.files).length};
}
export async function getProject(dir,id){
  const data=await readFile(fileFor(dir,id),'utf8');
  if(Buffer.byteLength(data)>MAX_PROJECT_BYTES)throw new Error('Project exceeds storage limit');
  const record=JSON.parse(data);
  if(record.id!==id)throw new Error('Project ID mismatch');
  return {...record,project:validateProject(record.project)};
}
export async function listProjects(dir){
  let entries;
  try{entries=await readdir(dir);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  const out=[];
  for(const name of entries.slice(0,300)){
    if(!/^[a-f0-9]{64}\.json$/.test(name))continue;
    try{const path=join(dir,name);if((await stat(path)).size>MAX_PROJECT_BYTES)continue;
      const data=JSON.parse(await readFile(path,'utf8'));
      if(!validProjectId(data.id)||fileFor(dir,data.id)!==path)continue;
      const project=validateProject(data.project);
      out.push({id:data.id,updatedAt:data.updatedAt,name:project.name,revision:project.revision,fileCount:Object.keys(project.files).length});
    }catch{}
  }
  return out.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
