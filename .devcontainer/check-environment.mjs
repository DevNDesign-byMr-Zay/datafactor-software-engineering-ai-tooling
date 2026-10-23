import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const entries=[];
const test = (name, fn) => {try {const detail=fn();entries.push({name,status:'PASS',detail:String(detail??'ok')});}catch(err){entries.push({name,status:'BLOCKED',detail:String(err?.message??err).slice(0,350)});}};
test('node',()=>{const v=Number(process.versions.node.split('.')[0]);if(v<22)throw new Error('Requires Node.js 22+');return process.version});
test('codespaces',()=>{if(process.env.CODESPACES!=='true')throw new Error('Not running in GitHub Codespaces');return 'cloud development environment'});
test('workbench-health',()=>{return execFileSync(process.execPath,['-e',`fetch('http://127.0.0.1:4545/api/health').then(async r=>{if(!r.ok)process.exit(1);console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(1))`],{encoding:'utf8',timeout:5000}).trim()});
test('docker-daemon',()=>execFileSync('docker',['info','--format','{{.ServerVersion}}'],{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim());
for (const [name,image] of [['node-image','reg.mini.dev/node:22'],['python-image','reg.mini.dev/python:3.13']]) {
  test(name,()=>execFileSync('docker',['image','inspect',image,'--format','{{.Id}}'],{encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim());
}
for(const x of entries)console.log(`${x.status.padEnd(7)} ${x.name} — ${x.detail}`);
if(entries.some(x=>x.status!=='PASS')){console.log('\nImage checks remain BLOCKED until you choose to pull them; no image downloads were performed.');process.exitCode=2;}
