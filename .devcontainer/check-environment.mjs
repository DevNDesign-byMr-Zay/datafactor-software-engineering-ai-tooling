import { execFileSync } from 'node:child_process';
import { SANDBOX_IMAGES } from '../apps/aetherforge-workbench/sandbox-runtime-policy.mjs';
const entries = [];
const test=(name,fn)=>{try{entries.push({name,status:'PASS',detail:String(fn()??'ok')})}catch(err){entries.push({name,status:'BLOCKED',detail:String(err?.message??err).slice(0,350)})}};
const exec=(binary,args,timeout=10000)=>execFileSync(binary,args,{encoding:'utf8',timeout,stdio:['ignore','pipe','pipe']}).trim();
test('node',()=>{if(Number(process.versions.node.split('.')[0])<22)throw new Error('Node 22+ required');return process.version});
test('codespaces',()=>{if(process.env.CODESPACES!=='true')throw new Error('Not in a GitHub Codespace');return 'cloud development environment'});
test('workbench-health',()=>exec(process.execPath,['-e',"fetch('http://127.0.0.1:4545/api/health').then(async r=>{if(!r.ok)process.exit(1);console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(1))"],5000));
test('docker-daemon',()=>exec('docker',['info','--format','{{.ServerVersion}}']));
for(const [name,image] of Object.entries(SANDBOX_IMAGES)){
 test(name+'-image',()=>exec('docker',['image','inspect',image,'--format','{{.Id}}']));
}
for(const result of entries)console.log(`${result.status.padEnd(7)} ${result.name} — ${result.detail}`);
if(entries.some(e=>e.status!=='PASS')){console.log('\nOnly missing checks are blocked. Pull Google Distroless images explicitly when ready; no images downloaded by this check.');process.exitCode=2;}
