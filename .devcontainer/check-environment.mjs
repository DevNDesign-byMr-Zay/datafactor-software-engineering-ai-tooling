/**
 * ÆTHERFORGE Codespaces readiness checks.
 *
 * Port 4546 is the commercial engineering IDE (required).
 * Port 4545 is the original companion (optional for commercial operation).
 * Container images are never pulled by readiness checks.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SANDBOX_IMAGES } from '../apps/aetherforge-workbench/sandbox-runtime-policy.mjs';

export function summarizeEnvironment(entries) {
  const blocked = entries.filter(row => row.status === 'BLOCKED');
  const optional = entries.filter(row => row.status === 'OPTIONAL');
  const missingImages = blocked.filter(row => row.name.endsWith('-image'));
  return {
    ready: blocked.length === 0,
    blocked: blocked.map(row => row.name),
    optional: optional.map(row => row.name),
    missingImages: missingImages.map(row => row.name),
  };
}

export async function checkEnvironment({
  codespaces = process.env.CODESPACES,
  nodeVersion = process.version,
  request = fetch,
  run = (bin,args,timeout=10000) => execFileSync(bin,args,{encoding:'utf8',timeout,stdio:['ignore','pipe','pipe']}).trim(),
} = {}) {
  const entries = [];
  const check = async (name, callback, {optional = false, hint = ''} = {}) => {
    try {
      entries.push({name, status: 'PASS', detail: String(await callback())});
    } catch (err) {
      const detail = hint || String(err?.message ?? err).slice(0,350);
      entries.push({name, status: optional ? 'OPTIONAL' : 'BLOCKED', detail});
    }
  };
  const health = async (port, {commercial=false}={}) => {
    const response=await request('http://127.0.0.1:'+port+'/api/health',{signal: AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();
    if(!data||data.adapter!=='ready')throw Error('Unexpected health contract on '+port);
    if(commercial && (data.product!=='aetherforge'||data.version!=='1.5.0-cloud'||data.projectPersistence!==true))
      throw Error('Commercial IDE health/version mismatch');
    return commercial ? data.version+' · project persistence enabled' : 'original companion ready';
  };
  await check('node',() => {
    if(Number(nodeVersion.slice(1).split('.')[0])<22)throw Error('Node 22+ required');
    return nodeVersion;
  });
  await check('codespaces',() => {
    if(codespaces!=='true')throw Error('Not a GitHub Codespace');
    return 'cloud development environment';
  });
  await check('commercial-health',()=>health(4546,{commercial:true}),{
    hint:'Commercial IDE 4546 unavailable. Start with: bash .devcontainer/start-commercial.sh',
  });
  await check('companion-health',()=>health(4545),{
    optional:true,
    hint:'Optional companion 4545 is not running. Start with: bash .devcontainer/start-aetherforge.sh',
  });
  await check('docker-daemon',()=>run('docker',['info','--format','{{.ServerVersion}}']),{
    hint:'Docker Engine unavailable in Codespaces; project execution requires a running Docker daemon',
  });
  for(const [language,image] of Object.entries(SANDBOX_IMAGES)) {
    await check(language+'-image',()=>run('docker',['image','inspect',image,'--format','{{.Id}}']),{
      hint:'Runtime image not available locally: '+image+'. Pull explicitly with: docker pull '+image,
    });
  }
  return entries;
}

if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  const entries=await checkEnvironment();
  for(const row of entries) console.log(row.status.padEnd(8)+' '+row.name+' — '+row.detail);
  const result=summarizeEnvironment(entries);
  if(result.ready) {
    console.log('ÆTHERFORGE commercial readiness: PASS'+(result.optional.length?' (optional companion not running)':''));
  } else {
    console.log('ÆTHERFORGE commercial readiness: BLOCKED ('+result.blocked.join(', ')+')');
    if(result.missingImages.length)console.log('Missing Docker images must be pulled explicitly; no images were downloaded by this check.');
    process.exitCode=2;
  }
}
