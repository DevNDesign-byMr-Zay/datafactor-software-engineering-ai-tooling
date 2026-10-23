/**
 * Create a reproducible, source-only ÆTHERFORGE Commercial release staging tree.
 * No user workspaces, Docker cache, credentials, or host-generated state is copied.
 */
import {cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile, lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const RELEASE_TAG='aetherforge-commercial-v1.5.0-cloud';
const PATHS=Object.freeze([
 'apps/aetherforge-commercial',
 'apps/aetherforge-workbench',
 'src',
 '.devcontainer/start-all.sh',
 '.devcontainer/start-aetherforge.sh',
 '.devcontainer/start-commercial.sh',
 '.devcontainer/stop-commercial.mjs',
 '.devcontainer/check-environment.mjs',
 '.devcontainer/verify-execution.mjs',
 '.devcontainer/backup-commercial.mjs',
 'docs/AETHERFORGE-COMMERCIAL-CLOUD.md',
 'docs/AETHERFORGE-CODESPACES.md'
]);
function outsideRepo(output){
 const r=relative(repo,output),reverse=relative(output,repo);
 return r&&reverse&&r!=='..'&&reverse!=='..'&&!r.startsWith('..'+sep)&&!reverse.startsWith('..'+sep) ? false : !(r===''||(!r.startsWith('..'+sep)&&!isAbsolute(r))||reverse===''||(!reverse.startsWith('..'+sep)&&!isAbsolute(reverse)));
}
async function manifestFiles(root,prefix=''){
 const list=[];
 for(const dirent of await readdir(join(root,prefix),{withFileTypes:true})){
  const p=prefix?prefix+'/'+dirent.name:dirent.name;
  if(dirent.isSymbolicLink())throw Error('Symbolic links are not permitted in commercial release: '+p);
  if(dirent.isDirectory())list.push(...await manifestFiles(root,p));
  else if(dirent.isFile()){
   const contents=await readFile(join(root,p));
   list.push({path:p,size:contents.length,sha256:createHash('sha256').update(contents).digest('hex')});
  }else throw Error('Unsupported release filesystem entry: '+p);
 }
 return list;
}
export async function buildCommercialPackage(destination,{root=repo}={}){
 const out=resolve(destination),base=resolve(root);
 if(out===base||out.startsWith(base+sep)||base.startsWith(out+sep))throw Error('Output must not overlap repository');
 await mkdir(out,{recursive:true});
 if((await readdir(out)).length)throw Error('Release output directory must be empty');
 for(const p of PATHS){
  const target=join(out,p);
  await mkdir(dirname(target),{recursive:true});
  await cp(join(base,p),target,{recursive:true,errorOnExist:true,force:false,dereference:false});
 }
 await writeFile(join(out,'package.json'),JSON.stringify({name:'aetherforge-commercial-release',version:'1.5.0-cloud',private:true,type:'module',engines:{node:'>=22'}},null,2)+'\n');
 const guide=`# ÆTHERFORGE Commercial v1.5.0-cloud — Release Bundle

This ZIP is the **source distribution** of the tested Commercial IDE (plus original companion and maintained module library), not a standalone `.exe`, iOS app or hosted SaaS. Browser `file://` cannot automatically start the Node/Docker services.

## Start in an existing GitHub Codespace
Use the original repository checkout at the tagged commit (not a second copy of this ZIP) and run:
```bash
bash .devcontainer/start-all.sh
```
Open the authenticated **private Codespaces port 4546** for Commercial and private 4545 for Companion. Keep both ports Private.

## Run extracted ZIP locally where Node.js 22+ is already installed
From the extracted folder:
```bash
node apps/aetherforge-commercial/server.mjs
```
Then open http://127.0.0.1:4546/ in your browser. This binds only to local loopback by default. You can start the original companion in a separate terminal with `node apps/aetherforge-workbench/server.mjs` (port 4545). The Docker Engine and approved Distroless images are optional prerequisites **only** for running JS/Python code in a container. Cloud Run and holographic actions are advisory; AI provider/QPU integration is not supplied.

The release contains no user-saved projects, private credentials, account data, secrets or Codespaces backups. Server-saved projects live in a local project store; use Engineering IDE → Export Project ZIP for important projects. README-CLOUD.md and docs/AETHERFORGE-COMMERCIAL-CLOUD.md cover Codespaces configuration.

**Windows note:** Administrator restrictions may prevent installing Node or Docker. This ZIP does not bypass those restrictions; an existing private Codespace can run the full verified cloud environment.
`;
 await writeFile(join(out,'START-HERE.md'),guide,'utf8');
 const docs=await manifestFiles(out);
 if(docs.some(x=>/^(?:.*\/)?(?:\.env|private\.key|credentials|id_rsa)(?:\/|$)/i.test(x.path)))throw Error('Sensitive filename in release');
 const manifest={release:RELEASE_TAG,application:'ÆTHERFORGE Commercial',version:'1.5.0-cloud',source:'main',fileCount:docs.length,files:docs.sort((a,b)=>a.path.localeCompare(b.path))};
 await writeFile(join(out,'SOURCE-SHA256.json'),JSON.stringify(manifest,null,2)+'\n');
 return {directory:out,fileCount:docs.length,manifest};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--output');
 if(i<0||!process.argv[i+1]){console.error('Usage: node tools/package-aetherforge-commercial.mjs --output <empty outside-repository-dir>');process.exitCode=2;}
 else try{
  const result=await buildCommercialPackage(process.argv[i+1]);
  console.log('[ÆTHERFORGE] Staged '+result.fileCount+' verified release files at '+result.directory);
 }catch(e){console.error(e.message);process.exitCode=2}
}
