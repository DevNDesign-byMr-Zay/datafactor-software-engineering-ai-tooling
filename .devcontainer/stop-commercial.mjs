/**
 * Stops only the current user's exact commercial server child.
 * Does not touch companion on 4545, Codespaces container or Docker daemon.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export function findCommercialPids(psOutput){
 return String(psOutput).split(/\r?\n/).map(line=>{
   const m=/^\s*(\d+)\s+(?:node|\/[^\s]+\/node) apps\/aetherforge-commercial\/server\.mjs\s*$/.exec(line);
   return m?Number(m[1]):null;
 }).filter(pid=>pid&&Number.isSafeInteger(pid));
}
async function main(){
 if(process.env.CODESPACES!=='true')throw Error('Only private GitHub Codespaces restarts are supported');
 const lines=execFileSync('ps',['-u',String(process.getuid()),'-o','pid=,args='],{encoding:'utf8',timeout:5000});
 const pids=findCommercialPids(lines);
 if(pids.length>1)throw Error('More than one commercial process found; refusing automatic restart');
 if(pids.length===1){
  process.kill(pids[0],'SIGTERM');
  console.log('[ÆTHERFORGE] Stopped only commercial IDE PID '+pids[0]+'. Companion 4545 was not touched.');
 }else{
  const alive=await fetch('http://127.0.0.1:4546/api/health',{signal:AbortSignal.timeout(1200)}).then(r=>r.ok).catch(()=>false);
  if(alive)throw Error('Commercial service exists but PID was not recognized; refusing to stop an unknown process');
  console.log('[ÆTHERFORGE] No existing commercial process found.');
 }
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 main().catch(e=>{console.error('[ÆTHERFORGE] '+e.message);process.exitCode=1});
}
