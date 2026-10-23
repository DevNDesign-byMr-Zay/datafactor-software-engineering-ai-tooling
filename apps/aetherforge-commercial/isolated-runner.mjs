/* Explicit-only Docker sandbox. NEVER run untrusted source with host node, vm, exec, or Python. */
import {spawn} from 'node:child_process';
import {posix as posixPath} from 'node:path';
import {MINIMUS_IMAGES,sandboxDockerArgs} from './minimus-sandbox-policy.mjs';
export const RUNTIMES=Object.freeze({
  node:{image:MINIMUS_IMAGES.node,command:['node','--input-type=commonjs','-']},
  python:{image:MINIMUS_IMAGES.python,command:['python','-I','-']}
});
function runCommand(args,{input='',timeout=3000,maxOutput=24000,spawnImpl=spawn}={}){
  return new Promise((resolve,reject)=>{
    const child=spawnImpl('docker',args,{shell:false,stdio:['pipe','pipe','pipe'],windowsHide:true,env:{...process.env,DOCKER_CLI_HINTS:'false'}});
    let stdout='',stderr='',exceeded=false,finished=false;
    const abort=setTimeout(()=>{exceeded=true;child.kill('SIGKILL');},timeout);
    const record=(key,chunk)=>{if(key==='stdout')stdout+=String(chunk);else stderr+=String(chunk);
      if(stdout.length+stderr.length>maxOutput){exceeded=true;child.kill('SIGKILL');}};
    child.stdout.on('data',b=>record('stdout',b));child.stderr.on('data',b=>record('stderr',b));
    child.on('error',e=>{if(!finished){finished=true;clearTimeout(abort);reject(e);}});
    child.on('close',(code)=>{if(finished)return;finished=true;clearTimeout(abort);resolve({exitCode:code,
      stdout:stdout.slice(0,maxOutput),stderr:stderr.slice(0,maxOutput),terminated:exceeded});});
    child.stdin.on('error',()=>{});child.stdin.end(input);
  });
}
// A running Docker daemon is not enough: --pull=never requires preloaded,
// explicitly-approved images. Report image state without downloading anything.
export async function capability({spawnImpl=spawn}={}){
  const runtimes=Object.keys(RUNTIMES);
  try{
    const out=await runCommand(['info','--format','{{.ServerVersion}}'],{timeout:2800,maxOutput:256,spawnImpl});
    const daemonReady=out.exitCode===0&&!out.terminated;
    if(!daemonReady)return {available:false,engine:'docker',requiresOperatorAction:true,runtimes,imagesReady:false,
      images:runtimes.map(language=>({language,image:RUNTIMES[language].image,status:'unknown'})),reason:'Docker daemon is not available'};
    const images=[];
    for(const language of runtimes){
      const image=RUNTIMES[language].image;
      const inspected=await runCommand(['image','inspect','--format','{{.Id}}',image],{timeout:2500,maxOutput:256,spawnImpl});
      images.push({language,image,status:inspected.exitCode===0&&!inspected.terminated?'ready':'missing'});
    }
    const imagesReady=images.every(item=>item.status==='ready');
    return {available:true,engine:'docker',requiresOperatorAction:true,runtimes,images,imagesReady,
      reason:imagesReady?'Distroless sandbox runtimes ready':'Distroless runtime images must be preloaded before execution'};
  }catch{
    return {available:false,engine:'docker',requiresOperatorAction:true,runtimes,imagesReady:false,
      images:runtimes.map(language=>({language,image:RUNTIMES[language].image,status:'unknown'})),reason:'Docker is not installed or accessible'};
  }
}
export async function runIsolated({language,code},{spawnImpl=spawn}={}){
  if(!Object.hasOwn(RUNTIMES,language)||typeof code!=='string'||!code.trim()||Buffer.byteLength(code)>32000)
    throw new Error('Invalid runner input');
  const r=RUNTIMES[language];
  const args=sandboxDockerArgs(language,r.command);
  const out=await runCommand(args,{input:code,timeout:6500,maxOutput:24000,spawnImpl});
  return {...out,engine:'docker',language,isolation:'no network; read-only; unprivileged; resource limited',
    status:out.terminated?'terminated':out.exitCode===0?'completed':'failed'};
}

/* Run a whole project only inside Docker. The project is transferred via stdin
   as data, never mounted from the host or evaluated by the API process. */
export const MAX_EXEC_PROJECT_BYTES=64*1024;
const EXEC_EXTENSIONS=Object.freeze({node:new Set(['.js','.mjs','.cjs','.json','.txt']),python:new Set(['.py','.json','.txt'])});
function safeProjectPath(name){
  return typeof name==='string'&&name.length>=3&&name.length<=180&&
    /^[A-Za-z0-9_./-]+$/.test(name)&&!name.startsWith('/')&&!name.endsWith('/')&&
    !name.split('/').some(part=>!part||part==='.'||part==='..')&&
    !name.split('/').some(part=>/^(?:\.env(?:\..*)?|credentials(?:\..*)?|id_rsa|secrets|private\.key)$/i.test(part));
}
export function validateRunnableProject({language,files,entry}){
  if(!Object.hasOwn(EXEC_EXTENSIONS,language)||!files||typeof files!=='object'||Array.isArray(files)||
     Object.getPrototypeOf(files)!==Object.prototype)throw Error('Unsupported project runner request');
  const entries=Object.entries(files);
  if(!entries.length||entries.length>32||!safeProjectPath(entry)||!Object.hasOwn(files,entry))throw Error('Invalid execution entry or file count');
  const entryExt=posixPath.extname(entry).toLowerCase();
  if(language==='node'&&!['.js','.mjs','.cjs'].includes(entryExt)||language==='python'&&entryExt!=='.py')throw Error('Selected entry must match the runtime');
  let bytes=0;
  for(const [name,value] of entries){
    if(!safeProjectPath(name)||!EXEC_EXTENSIONS[language].has(posixPath.extname(name).toLowerCase())||
       typeof value!=='string'||value.includes('\u0000'))throw Error('Unsafe execution file');
    bytes+=Buffer.byteLength(value,'utf8');
  }
  if(bytes>MAX_EXEC_PROJECT_BYTES)throw Error('Execution snapshot exceeds 64 KiB');
  return {language,files:Object.fromEntries(entries),entry};
}
const NODE_PROJECT_BOOTSTRAP=String.raw`const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const job=JSON.parse(fs.readFileSync(0,'utf8')),root='/tmp/work';fs.mkdirSync(root,{recursive:true});
for(const [name,body] of Object.entries(job.files)){const out=path.join(root,name);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,body,{mode:0o600});}
const run=cp.spawnSync(process.execPath,[path.join(root,job.entry)],{cwd:root,encoding:'utf8',timeout:4300,maxBuffer:24000});
if(run.stdout)process.stdout.write(run.stdout);if(run.stderr)process.stderr.write(run.stderr);
if(run.error)process.stderr.write(String(run.error.message));process.exit(run.status??1);`;
const PYTHON_PROJECT_BOOTSTRAP=String.raw`import json,os,pathlib,runpy,sys,traceback
job=json.load(sys.stdin);root=pathlib.Path('/tmp/work');root.mkdir(parents=True,exist_ok=True)
for name,body in job['files'].items():
 p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(body,encoding='utf-8')
os.chdir(root);entry=root/job['entry'];sys.path.insert(0,str(entry.parent));sys.path.insert(0,str(root))
try:runpy.run_path(str(entry),run_name='__main__')
except SystemExit as e:sys.exit(e.code if isinstance(e.code,int) else 1)
except BaseException:traceback.print_exc();sys.exit(1)`;
export async function runIsolatedProject(job,{spawnImpl=spawn}={}){
  const safe=validateRunnableProject(job);
  const image=RUNTIMES[safe.language].image;
  const cmd=safe.language==='node'?['node','-e',NODE_PROJECT_BOOTSTRAP]:['python','-I','-c',PYTHON_PROJECT_BOOTSTRAP];
  const args=sandboxDockerArgs(safe.language,cmd);
  const out=await runCommand(args,{input:JSON.stringify(safe),timeout:7500,maxOutput:24000,spawnImpl});
  return {...out,engine:'docker',language:safe.language,entry:safe.entry,fileCount:Object.keys(safe.files).length,
    isolation:'no network; no host mounts; read-only image; unprivileged; bounded resources',
    status:out.terminated?'terminated':out.exitCode===0?'completed':'failed'};
}
