/**
 * On-demand, private ÆTHERFORGE state snapshot for GitHub Codespaces.
 *
 * Archive is always outside the git worktree. Only known server-managed
 * project JSON and hashed image/metadata files are included.
 * No Docker, remote network calls, service restarts, or git mutations.
 */
import {createHash, randomBytes} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdir, readdir, lstat, rename, unlink, chmod, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_NAME=/^[a-f0-9]{64}\.json$/;
const ASSET_NAME=/^[a-f0-9]{64}\.(?:png|jpg|webp)(?:\.json)?$/;
const MAX_FILE=6*1024*1024+1024;
const MAX_TOTAL=1024*1024*1024;

export async function enumerateState(sourceRoot){
 const rootStat=await lstat(sourceRoot);
 if(!rootStat.isDirectory()||rootStat.isSymbolicLink())throw Error('Source is not a real directory');
 const found=[];let total=0;
 for(const folder of ['workspaces','assets']){
  const dir=join(sourceRoot,folder);
  let dirInfo;try{dirInfo=await lstat(dir)}catch(err){if(err.code==='ENOENT')continue;throw err}
  if(!dirInfo.isDirectory()||dirInfo.isSymbolicLink())throw Error('Unsafe state folder: '+folder);
  for(const entry of await readdir(dir)){
   if(!(folder==='workspaces'?PROJECT_NAME:ASSET_NAME).test(entry))continue;
   const path=join(dir,entry),info=await lstat(path);
   if(!info.isFile()||info.isSymbolicLink())throw Error('Unsafe state file: '+folder+'/'+entry);
   if(info.size>MAX_FILE)throw Error('Oversized state file: '+folder+'/'+entry);
   total+=info.size;
   if(total>MAX_TOTAL||found.length>=750)throw Error('Backup exceeds bounded archive limits');
   found.push(folder+'/'+entry);
  }
 }
 return found.sort();
}

export async function createBackup({
 sourceRoot='/workspaces/.aetherforge-data',
 destinationRoot='/workspaces/.aetherforge-backups',
 now=new Date(),
 run=execFileSync
}={}){
 // The executable CLI provides fixed /workspaces paths; injectable paths are
 // permitted only for isolated tests of the pure backup function.
 if(sourceRoot==='/workspaces/.aetherforge-data' && destinationRoot!=='/workspaces/.aetherforge-backups')
   throw Error('Private Codespaces backups must remain outside the repository');
 if(sourceRoot===destinationRoot||destinationRoot.startsWith(sourceRoot+'/')||sourceRoot.startsWith(destinationRoot+'/'))throw Error('Source and backup roots must be disjoint');
 const paths=await enumerateState(sourceRoot);
 if(!paths.length)throw Error('No server-saved projects or assets found; export any browser-only projects from the IDE first');
 await mkdir(destinationRoot,{recursive:true,mode:0o700});
 const dest=await lstat(destinationRoot);if(!dest.isDirectory()||dest.isSymbolicLink())throw Error('Unsafe backup destination');
 const time=now.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
 const filename='aetherforge-cloud-'+time+'-'+randomBytes(4).toString('hex')+'.tar.gz';
 const outfile=join(destinationRoot,filename),partial=outfile+'.partial';
 try{
  run('tar',['-czf',partial,'-C',sourceRoot,'--',...paths],{shell:false,encoding:'utf8',timeout:120000,maxBuffer:128000});
  const result=run('tar',['-tzf',partial],{shell:false,encoding:'utf8',timeout:30000,maxBuffer:262144}).trim().split('\n').filter(Boolean).map(x=>x.replace(/^\.\//,''));
  if(paths.length!==result.length||paths.some((path,i)=>path!==result[i]))throw Error('Archive inventory verification failed');
  const hash=createHash('sha256');
  for await(const chunk of createReadStream(partial))hash.update(chunk);
  const checksum=hash.digest('hex');
  await chmod(partial,0o600);
  await rename(partial,outfile);
  await writeFile(outfile+'.sha256',checksum+'  '+filename+'\n',{flag:'wx',mode:0o600});
  return {archive:outfile,checksum,files:paths.length};
 }catch(err){
  await unlink(partial).catch(()=>{});
  throw err;
 }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 if(process.env.CODESPACES!=='true'){console.error('[ÆTHERFORGE] Backups run only in the private Codespace.');process.exit(2)}
 try{
  const result=await createBackup();
  console.log('[ÆTHERFORGE] Verified PRIVATE snapshot: '+result.archive);
  console.log('[ÆTHERFORGE] '+result.files+' server-managed files; SHA-256: '+result.checksum);
  console.log('[ÆTHERFORGE] Download it securely from the Codespaces explorer if needed. Never commit or publish this archive.');
 }catch(e){console.error('[ÆTHERFORGE] Backup not created: '+e.message);process.exitCode=2}
}
