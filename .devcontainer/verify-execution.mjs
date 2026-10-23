/**
 * On-demand Codespaces acceptance smoke for the two approved language runtimes.
 * Requires the operator to explicitly pull images beforehand.
 * Runs inert one-line probes, not user-supplied code.
 */
import { spawnSync } from 'node:child_process';
import { SANDBOX_IMAGES, sandboxDockerArgs } from '../apps/aetherforge-workbench/sandbox-runtime-policy.mjs';
const cases = [
 {language:'node', command:['node','-e',"console.log('AETHERFORGE NODE EXECUTION: PASS')"], expected:'AETHERFORGE NODE EXECUTION: PASS'},
 {language:'python',command:['python','-c',"print('AETHERFORGE PYTHON EXECUTION: PASS')"],expected:'AETHERFORGE PYTHON EXECUTION: PASS'}
];
let failed=0;
for(const entry of cases){
 const check=spawnSync('docker',['image','inspect',SANDBOX_IMAGES[entry.language]],{timeout:10000,encoding:'utf8',stdio:'pipe'});
 if(check.status!==0){
  console.log('BLOCKED '+entry.language+' — Image not pulled: '+SANDBOX_IMAGES[entry.language]);
  failed++;
  continue;
 }
 const args=sandboxDockerArgs(entry.language,entry.command);
 const result=spawnSync('docker',args,{timeout:20000,encoding:'utf8',maxBuffer:65536,stdio:['pipe','pipe','pipe'],input:''});
 const good=result.status===0&&result.stdout.includes(entry.expected);
 console.log((good?'PASS ':'FAIL ')+entry.language+' — '+(good?entry.expected:String(result.stderr||result.error||'unexpected result').slice(0,450)));
 if(!good)failed++;
}
if(failed){console.log(failed+' runtime smoke check(s) unavailable/failed. No unsafe execution fallback.');process.exitCode=2;}
