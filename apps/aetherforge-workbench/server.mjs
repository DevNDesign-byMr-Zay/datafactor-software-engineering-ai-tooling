import { getLogger } from '../../src/observability/json-logger.js';
import { createWorkbenchStaticRoutes, serveWorkbenchStaticRoute } from '../../src/api/workbench-static-routes.js';
import { createWorkbenchFailureHandler } from '../../src/api/workbench-http-failure.js';
import { rejectWorkbenchRequestBoundary } from '../../src/api/workbench-request-boundary.js';
import { createWorkbenchResponder } from '../../src/api/workbench-http-response.js';
import { workflowRequestSchema } from '../../src/api/workflow-request-schema.js';
import { createServer } from 'node:http';
import { createRequestBodyReader, RequestBodyError } from './http-request-body.mjs';
import { createHttpErrorTracker } from './http-error-tracker.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { saveLocalAsset, listLocalAssets, getLocalAsset } from './asset-store.mjs';
import { WORKBENCH_MODULES, runWorkbenchAction, summarizeWorkbench } from '../../src/api/workbench-contract.js';
const root = dirname(fileURLToPath(import.meta.url));
const staticRoutes = createWorkbenchStaticRoutes('companion');
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
 if(await serveWorkbenchStaticRoute({routes:staticRoutes,pathname:url.pathname,method:req.method,root,res,respond}))return;return respond(res,404,{error:'Not found'});
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
