import { getLogger } from '../../src/observability/json-logger.js';
import { createWorkbenchFailureHandler } from '../../src/api/workbench-http-failure.js';
import { rejectWorkbenchRequestBoundary } from '../../src/api/workbench-request-boundary.js';
import { createWorkbenchResponder } from '../../src/api/workbench-http-response.js';
import { workflowRequestSchema } from '../../src/api/workflow-request-schema.js';
import { createServer } from 'node:http';
import { createRequestBodyReader, RequestBodyError } from './http-request-body.mjs';
import { createHttpErrorTracker } from './http-error-tracker.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { saveLocalAsset, listLocalAssets, getLocalAsset } from './asset-store.mjs';
import { WORKBENCH_MODULES, runWorkbenchAction, summarizeWorkbench } from '../../src/api/workbench-contract.js';
const root = dirname(fileURLToPath(import.meta.url));
const staticRoutes = new Map([
 ['/aetherforge-corpus/navigation.css',['../aetherforge-corpus/navigation.css','text/css; charset=utf-8']],
 ['/aetherforge-corpus/index.html',['../aetherforge-corpus/index.html','text/html; charset=utf-8']],
 ['/aetherforge-corpus/catalog.browser.js',['../aetherforge-corpus/catalog.browser.js','text/javascript; charset=utf-8']],
 ['/aetherforge-corpus/catalog-core.js',['../aetherforge-corpus/catalog-core.js','text/javascript; charset=utf-8']],
 ['/aetherforge-corpus/viewer.js',['../aetherforge-corpus/viewer.js','text/javascript; charset=utf-8']],
 ['/aetherforge-corpus/viewer.css',['../aetherforge-corpus/viewer.css','text/css; charset=utf-8']],
 ['/aetherforge-corpus/manifest.json',['../aetherforge-corpus/manifest.json','application/json; charset=utf-8']],
 ['/aetherforge-corpus/software-engineering-ai-tooling.zip',['../aetherforge-corpus/software-engineering-ai-tooling.zip','application/zip']],
 ['/aetherforge-workbench/assets/aetherforge-icon.svg',['assets/aetherforge-icon.svg','image/svg+xml']],
 ['/aetherforge-workbench/assets/aetherforge-emblem.svg',['assets/aetherforge-emblem.svg','image/svg+xml']],
  ['/assets/references/app-icon.webp', ['assets/references/app-icon.webp', 'image/webp']],
  ['/assets/references/brand-identity-board.webp', ['assets/references/brand-identity-board.webp', 'image/webp']],
  ['/assets/references/desktop-ui-concept.webp', ['assets/references/desktop-ui-concept.webp', 'image/webp']],
  ['/assets/references/mobile-ui-concept.webp', ['assets/references/mobile-ui-concept.webp', 'image/webp']],
  ['/assets/references/orbit-emblem.webp', ['assets/references/orbit-emblem.webp', 'image/webp']],
  ['/assets/references/primary-logo.webp', ['assets/references/primary-logo.webp', 'image/webp']],
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.css', ['app.css', 'text/css; charset=utf-8']],
  ['/app-v2.css', ['app-v2.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/app-behavior.js', ['app-behavior.js', 'text/javascript; charset=utf-8']],
  ['/workspace-memory.js', ['workspace-memory.js', 'text/javascript; charset=utf-8']],
  ['/command-rail.js', ['command-rail.js', 'text/javascript; charset=utf-8']],
  ['/workflow-studio.js', ['workflow-studio.js', 'text/javascript; charset=utf-8']],
  ['/workflow-studio-export.js', ['workflow-studio-export.js', 'text/javascript; charset=utf-8']],
  ['/evidence-center.js', ['evidence-center.js', 'text/javascript; charset=utf-8']],
  ['/assets/reference-manifest.json', ['assets/reference-manifest.json', 'application/json; charset=utf-8']],
  ['/assets/aetherforge-logo.svg', ['assets/aetherforge-logo.svg', 'image/svg+xml']],
  ['/assets/aetherforge-emblem.svg', ['assets/aetherforge-emblem.svg', 'image/svg+xml']],
  ['/assets/aetherforge-icon.svg', ['assets/aetherforge-icon.svg', 'image/svg+xml']]
]);
const respond = createWorkbenchResponder('companion');
export function createWorkbenchServer({requestBodyTimeoutMs=15000,maxConcurrentBodyRequests=8,assetRoot=process.env.AETHERFORGE_DATA_DIR||join(root,'.local-assets'),errorTracker=createHttpErrorTracker('aetherforge-workbench')}={}){const readBody=createRequestBodyReader({timeoutMs:requestBodyTimeoutMs,maxConcurrent:maxConcurrentBodyRequests});const handleHttpFailure=createWorkbenchFailureHandler({RequestBodyError,respond,errorTracker});return createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');
 const boundaryError=rejectWorkbenchRequestBoundary(req,{port:Number(process.env.AETHERFORGE_PORT||4545)});
 if(boundaryError)return respond(res,403,{error:boundaryError});
 if(req.method==='GET'&&url.pathname==='/api/health')return respond(res,200,{adapter:'ready',source:'maintained-library',offline:false,canExecuteDeployments:false,aiConfigured:false});
 if(req.method==='GET'&&url.pathname==='/api/modules')return respond(res,200,{source:'canonical maintained exports',modules:WORKBENCH_MODULES});
 if(req.method==='GET'&&url.pathname==='/api/workbench/summary')return respond(res,200,summarizeWorkbench());
 if(req.method==='POST'&&url.pathname==='/api/run'){if(req.headers['content-type']?.split(';')[0]?.trim()!=='application/json')return respond(res,415,{error:'JSON content type required'});const raw=(await readBody(req,res,64*1024,'Request exceeds limit')).toString('utf8');try{return respond(res,200,runWorkbenchAction(workflowRequestSchema.parse(JSON.parse(raw))));}catch{return respond(res,422,{error:'Invalid workflow input. Review the required fields.'});}}
 if(req.method==='GET'&&url.pathname==='/api/assets')return respond(res,200,{assets:await listLocalAssets(assetRoot)});
 if(req.method==='GET'&&url.pathname.startsWith('/api/assets/')){const id=url.pathname.slice('/api/assets/'.length);if(!/^[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(id))return respond(res,404,{error:'Invalid asset'});try{const data=await getLocalAsset(assetRoot,id);return respond(res,200,data.bytes,data.mime);}catch{return respond(res,404,{error:'Asset not found'});}}
 if(req.method==='POST'&&url.pathname==='/api/assets/upload'){const mime=String(req.headers['content-type']||'').trim();let name;try{name=decodeURIComponent(String(req.headers['x-file-name']||'asset'));}catch{return respond(res,400,{error:'Invalid filename'});}const bytes=await readBody(req,res,6*1024*1024,'File too large');try{const item=await saveLocalAsset(assetRoot,bytes,name,mime);return respond(res,201,{asset:item});}catch{return respond(res,415,{error:'File type, signature or size not supported'});}}
 const asset=staticRoutes.get(url.pathname);if(req.method==='GET'&&asset){const file=await readFile(join(root,asset[0]));return respond(res,200,file,asset[1]);}return respond(res,404,{error:'Not found'});
 }catch(error){return handleHttpFailure(error,req,res);}});}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const port=Number(process.env.AETHERFORGE_PORT||4545);
 const bound=process.env.CODESPACES==='true'&&process.env.AETHERFORGE_CODESPACES_BIND==='1'?'0.0.0.0':'127.0.0.1';
 const logger=getLogger('aetherforge-workbench');
 const server=createWorkbenchServer();
 server.listen(port,bound,()=>{
   logger.info({event:'http.server.started',host:bound,port:server.address().port},'Local adapter ready');
 });
}
