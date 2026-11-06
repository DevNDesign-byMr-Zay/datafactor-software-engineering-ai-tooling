import { getLogger } from '../../src/observability/json-logger.js';
import { createWorkbenchStaticRoutes, serveWorkbenchStaticRoute } from '../../src/api/workbench-static-routes.js';
import { createWorkbenchFailureHandler } from '../../src/api/workbench-http-failure.js';
import { rejectWorkbenchRequestBoundary } from '../../src/api/workbench-request-boundary.js';
import { createWorkbenchResponder } from '../../src/api/workbench-http-response.js';
import { workflowRequestSchema } from '../../src/api/workflow-request-schema.js';
import { createServer } from 'node:http';
import { createRequestBodyReader, RequestBodyError } from '../aetherforge-workbench/http-request-body.mjs';
import { createHttpErrorTracker } from '../aetherforge-workbench/http-error-tracker.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enumerateMirrors,readMirrorFile } from './upstream-mirror.mjs';
import { saveLocalAsset, listLocalAssets, getLocalAsset } from './asset-store.mjs';
import {listProjects,putProject,getProject,validProjectId,MAX_PROJECT_BYTES} from './workspace-store.mjs';
import {capability,runIsolated,runIsolatedProject,validateRunnableProject} from './isolated-runner.mjs';
import { WORKBENCH_MODULES, runWorkbenchAction, summarizeWorkbench } from '../../src/api/workbench-contract.js';
const root = dirname(fileURLToPath(import.meta.url));
const staticRoutes = createWorkbenchStaticRoutes('commercial');
const respond = createWorkbenchResponder('commercial');
export function createWorkbenchServer({requestBodyTimeoutMs=15000,maxConcurrentBodyRequests=8,assetRoot=process.env.AETHERFORGE_DATA_DIR||join(root,'.local-assets'),workspaceRoot=process.env.AETHERFORGE_WORKSPACE_DIR||join(root,'.local-workspaces'),errorTracker=createHttpErrorTracker('aetherforge-commercial')}={}){const readBody=createRequestBodyReader({timeoutMs:requestBodyTimeoutMs,maxConcurrent:maxConcurrentBodyRequests});const handleHttpFailure=createWorkbenchFailureHandler({RequestBodyError,respond,errorTracker});return createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');
 const boundaryError=rejectWorkbenchRequestBoundary(req,{port:Number(process.env.AETHERFORGE_PORT||4546)});
 if(boundaryError)return respond(res,403,{error:boundaryError});
 if(req.method==='GET'&&url.pathname==='/api/health')return respond(res,200,{adapter:'ready',product:'aetherforge',version:'1.5.0-cloud',source:'maintained-library',offline:false,canExecuteDeployments:false,aiConfigured:false,projectPersistence:true,isolatedRunner:'optional-docker',multiFileExecution:true});
 if(req.method==='GET'&&url.pathname==='/api/upstream/local-index')return respond(res,200,{kind:'local-mirror',files:await enumerateMirrors(join(root,'../..','upstream-mirror'))});
 if(req.method==='GET'&&url.pathname==='/api/upstream/local-file'){try{const text=await readMirrorFile(join(root,'../..','upstream-mirror'),url.searchParams.get('repoId'),url.searchParams.get('path'));return respond(res,200,text,'text/plain; charset=utf-8');}catch{return respond(res,404,{error:'Not a readable mirrored text file'});}}
 if(req.method==='GET'&&url.pathname==='/api/workspace/projects')return respond(res,200,{projects:await listProjects(workspaceRoot)});
 if(req.method==='GET'&&/^\/api\/workspace\/projects\/[A-Za-z0-9_-]+$/.test(url.pathname)){
   const id=url.pathname.split('/').at(-1);try{return respond(res,200,await getProject(workspaceRoot,id));}catch{return respond(res,404,{error:'Project not found'});}
 }
 if(req.method==='PUT'&&url.pathname.startsWith('/api/workspace/projects/')){
   const id=url.pathname.split('/').at(-1);
   if(!validProjectId(id))return respond(res,400,{error:'Invalid project ID'});
   if(req.headers['x-aetherforge-local']!=='1'||!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{error:'Explicit local JSON request required'});
   const bytes=await readBody(req,res,MAX_PROJECT_BYTES,'Project is too large');
   try{return respond(res,200,{project:await putProject(workspaceRoot,id,JSON.parse(bytes.toString('utf8')))});}
   catch{return respond(res,422,{error:'Project schema rejected'});}
 }
 if(req.method==='GET'&&url.pathname==='/api/diagnostics'){
   const result={product:'aetherforge',version:'1.5.0-cloud',state:'ready',uptimeSeconds:Math.floor(process.uptime()),
     loopback:true,projectPersistence:true,assetStore:true,sourceMirror:'optional',
     execution:'operator-approved-docker-only',networkExecution:false,
     runtime:{nodeMajor:Number(process.versions.node.split('.')[0]),platform:process.platform},
     advice:['Open the workbench from its launcher URL, not file://',
       'Use Saved Projects to verify persistence',
       'Cloud Docker must be running and Google Distroless images preloaded before executing Node/Python']};
   return respond(res,200,result);
 }
 if(req.method==='GET'&&url.pathname==='/api/execution/capabilities')return respond(res,200,await capability());
 if(req.method==='POST'&&url.pathname==='/api/execution/project'){
   if(req.headers['x-aetherforge-local']!=='1'||!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{error:'Explicit local JSON request required'});
   const bytes=await readBody(req,res,76000,'Execution snapshot too large');
   try{
     const body=JSON.parse(bytes.toString('utf8'));
     if(!body||body.confirmRun!==true)return respond(res,422,{error:'Explicit execution confirmation required'});
     const job=validateRunnableProject(body);
     const available=await capability();if(!available.available)return respond(res,503,{error:available.reason,requiresDocker:true});
     if(available.images?.find(item=>item.language===job.language)?.status!=='ready')return respond(res,503,{error:'The selected Google Distroless image is not preloaded in Docker. Pull the approved image first.',requiresDocker:true,requiresImage:job.language});
     return respond(res,200,await runIsolatedProject(job));
   }catch{return respond(res,422,{error:'Invalid isolated multi-file execution request'});}
 }
 if(req.method==='POST'&&url.pathname==='/api/execution/run'){
   if(req.headers['x-aetherforge-local']!=='1'||!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{error:'Explicit local JSON request required'});
   const bytes=await readBody(req,res,35000,'Execution source too large');
   try{const body=JSON.parse(bytes.toString('utf8'));
     if(!body||body.confirmRun!==true)return respond(res,422,{error:'Explicit execution confirmation required'});
     const available=await capability();if(!available.available)return respond(res,503,{error:available.reason,requiresDocker:true});
     if(available.images?.find(item=>item.language===body.language)?.status!=='ready')return respond(res,503,{error:'The selected Google Distroless image is not preloaded in Docker. Pull the approved image first.',requiresDocker:true,requiresImage:body.language});
     return respond(res,200,await runIsolated({language:body.language,code:body.code}));
   }catch{return respond(res,422,{error:'Invalid isolated execution request'});}
 }
 if(req.method==='GET'&&url.pathname==='/api/modules')return respond(res,200,{source:'canonical maintained exports',modules:WORKBENCH_MODULES});
 if(req.method==='GET'&&url.pathname==='/api/workbench/summary')return respond(res,200,summarizeWorkbench());
 if(req.method==='POST'&&url.pathname==='/api/run'){if(req.headers['content-type']?.split(';')[0]?.trim()!=='application/json')return respond(res,415,{error:'JSON content type required'});const raw=(await readBody(req,res,64*1024,'Request exceeds limit')).toString('utf8');try{return respond(res,200,runWorkbenchAction(workflowRequestSchema.parse(JSON.parse(raw))));}catch{return respond(res,422,{error:'Invalid workflow input. Review the required fields.'});}}
 if(req.method==='GET'&&url.pathname==='/api/assets')return respond(res,200,{assets:await listLocalAssets(assetRoot)});
 if(req.method==='GET'&&url.pathname.startsWith('/api/assets/')){const id=url.pathname.slice('/api/assets/'.length);if(!/^[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(id))return respond(res,404,{error:'Invalid asset'});try{const data=await getLocalAsset(assetRoot,id);return respond(res,200,data.bytes,data.mime);}catch{return respond(res,404,{error:'Asset not found'});}}
 if(req.method==='POST'&&url.pathname==='/api/assets/upload'){const mime=String(req.headers['content-type']||'').trim();let name;try{name=decodeURIComponent(String(req.headers['x-file-name']||'asset'));}catch{return respond(res,400,{error:'Invalid filename'});}const bytes=await readBody(req,res,6*1024*1024,'File too large');try{const item=await saveLocalAsset(assetRoot,bytes,name,mime);return respond(res,201,{asset:item});}catch{return respond(res,415,{error:'File type, signature or size not supported'});}}
 if(req.method==='GET'&&url.pathname==='/sandbox-frame.html'){
   // This is the only same-origin frameable route; the main app and all APIs
   // retain X-Frame-Options DENY and frame-ancestors none.
   // The browser also sets iframe sandbox="allow-scripts" (no same-origin).
   const body=await readFile(join(root,'sandbox-frame.html'));
   res.writeHead(200,{
     'Content-Type':'text/html; charset=utf-8',
     'X-Content-Type-Options':'nosniff',
     'Cache-Control':'no-store',
     'Referrer-Policy':'no-referrer',
     'X-Frame-Options':'SAMEORIGIN',
     'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'"
   });
   res.end(body);return;
 }

 if(await serveWorkbenchStaticRoute({routes:staticRoutes,pathname:url.pathname,method:req.method,root,res,respond}))return;return respond(res,404,{error:'Not found'});
 }catch(error){return handleHttpFailure(error,req,res);}});}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const port=Number(process.env.AETHERFORGE_PORT||4546);
 const bound=process.env.CODESPACES==='true'&&process.env.AETHERFORGE_CODESPACES_BIND==='1'?'0.0.0.0':'127.0.0.1';
 const logger=getLogger('aetherforge-commercial');
 const server=createWorkbenchServer();
 server.listen(port,bound,()=>{
   logger.info({event:'http.server.started',host:bound,port:server.address().port},'Local adapter ready');
 });
}
