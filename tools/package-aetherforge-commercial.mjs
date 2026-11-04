/**
 * Create a reproducible, source-only ÆTHERFORGE Commercial release staging tree.
 * No user workspaces, Docker cache, credentials, or host-generated state is copied.
 */
import {cp, mkdir, readdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertOutsideRepository, copyDistributionSource, writeDistributionManifest, writeDistributionArchive} from './distribution-files.mjs';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const RELEASE_TAG='aetherforge-commercial-v1.5.0-cloud';
const PATHS=Object.freeze([
 'apps/aetherforge-corpus',
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
export async function buildCommercialPackage(destination,{root=repo}={}){
 const out=resolve(destination),base=resolve(root);
 assertOutsideRepository(out,base);
 await mkdir(out,{recursive:true});
 if((await readdir(out)).length)throw Error('Release output directory must be empty');
 for(const p of PATHS){
  const target=join(out,p);
  await mkdir(dirname(target),{recursive:true});
  await copyDistributionSource(join(base,p),target,p);
 }
 await writeFile(join(out,'package.json'),JSON.stringify({name:'aetherforge-commercial-release',version:'1.5.0-cloud',private:true,type:'module',engines:{node:'>=22'}},null,2)+'\n');
 const guide = `# ÆTHERFORGE Commercial — Local Source Distribution

Open **index.html** to initialize the complete Commercial workbench in your browser. The extracted folders must remain together. Browser mode includes navigation, the reference collection, browser-local projects, and explicitly unverified Brush/Sustainability reference calculations. HTML cannot start Node or Docker. Maintained receipt verification and server persistence require the local adapter.

## Windows without administrator privileges

1. Extract the complete ZIP to a user-writable folder.
2. Use Node.js 22+ on PATH, or extract an approved Windows Node.js ZIP and place its node.exe at runtime/node.exe within this folder. No installer, global packages, npm install or administrator privileges are needed by this application.
3. Double-click AETHERFORGE.cmd. It checks Node, starts the local service, waits for the health endpoint, and opens http://127.0.0.1:4546/.
4. Close the local server console to stop it. Use START-COMPANION.cmd for the original workbench on port 4545.

## Other systems

Run \`node apps/aetherforge-commercial/server.mjs\` from the extracted folder, then open http://127.0.0.1:4546/. The Companion command is \`node apps/aetherforge-workbench/server.mjs\`.

## Verify before launch

Compare the ZIP SHA-256 with its adjacent .sha256 file. From the extracted folder run \`node verify-distribution.mjs\` before starting the service; it checks every file against SOURCE-SHA256.json and rejects unexpected files. Runtime use creates local state after this initial verification. See LOCAL-DISTRIBUTION.md for the exact structure, PowerShell checks, offline boundaries and clean-extraction acceptance commands.

## Existing GitHub Codespaces

Use the original repository checkout at the intended tested commit and run:
\`\`\`bash
bash .devcontainer/start-all.sh
\`\`\`
Open the authenticated **private Codespaces port 4546** for Commercial and private 4545 for Companion. Keep both ports Private. Browser \`file://\` cannot start those services.

The complete reference collection is at apps/aetherforge-corpus/index.html: 1,610 original files in 40 folders, exact-byte downloads, SHA-256 inventory and original ZIP. Historical samples remain read-only data.

Docker and approved Distroless images are optional prerequisites only for an explicit isolated JS/Python Run action. No Docker daemon or code runner starts from HTML. Cloud Run and holographic actions remain advisory; AI/QPU integrations require separately supplied providers. No private workspaces, credentials or account data are included. This is source distribution, not a standalone executable, signed iOS application or hosted service. See README-CLOUD.md in the Commercial app for server deployment boundaries.
`;
 await writeFile(join(out,'START-HERE.md'),guide,'utf8');
 await writeFile(join(out,'index.html'),'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#081223"><meta name="description" content="ÆtherForge Commercial local engineering workbench with offline browser tools and a separately started local adapter."><meta http-equiv="refresh" content="0;url=./apps/aetherforge-commercial/index.html"><title>ÆtherForge · Opening Workbench</title></head><body><h1>ÆTHERFORGE</h1><p>Opening your engineering workbench… <a href="./apps/aetherforge-commercial/index.html">Open browser workbench</a></p><p>Local services require <strong>AETHERFORGE.cmd</strong>. <a href="./START-HERE.md">First-run instructions</a></p></body></html>\n');
 await writeFile(join(out,'AETHERFORGE.cmd'),'@echo off\r\ncall "%~dp0apps\\aetherforge-commercial\\launch-aetherforge.cmd"\r\n');
 await writeFile(join(out,'START-COMPANION.cmd'),'@echo off\r\ncall "%~dp0apps\\aetherforge-workbench\\launch-aetherforge.cmd"\r\n');
 for (const file of ['distribution-files.mjs','verify-distribution.mjs']) await cp(join(base,'tools',file),join(out,file));
 await cp(join(base,'docs/AETHERFORGE-LOCAL-DISTRIBUTION.md'),join(out,'LOCAL-DISTRIBUTION.md'));
 const manifest=await writeDistributionManifest(out,{
  buildKind:'unpublished-source-distribution',release:RELEASE_TAG,application:'ÆTHERFORGE Commercial',version:'1.5.0-cloud',source:'repository checkout',
  runtime:{node:'>=22',defaultPort:4546,installRequired:false},
  entrypoints:{browser:'index.html',windows:'AETHERFORGE.cmd',server:'apps/aetherforge-commercial/server.mjs'}
 });
 return {directory:out,fileCount:manifest.fileCount,manifest};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const i=process.argv.indexOf('--output');
 if(i<0||!process.argv[i+1]){console.error('Usage: node tools/package-aetherforge-commercial.mjs --output <empty outside-repository-dir>');process.exitCode=2;}
 else try{
  const result=await buildCommercialPackage(process.argv[i+1]);
  const archive=await writeDistributionArchive(result.directory);
  console.log('[ÆTHERFORGE] Staged '+result.fileCount+' verified release files at '+result.directory+'\nZIP: '+archive.path+'\nSHA-256: '+archive.sha256);
 }catch(e){console.error(e.message);process.exitCode=2}
}
