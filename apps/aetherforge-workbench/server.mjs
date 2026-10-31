import { workflowRequestSchema } from '../../src/api/workflow-request-schema.js';
import { createServer } from 'node:http';
import { createHttpErrorTracker } from './http-error-tracker.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { saveLocalAsset, listLocalAssets, getLocalAsset } from './asset-store.mjs';
import {
  buildCloudRunDeployArgs, clampBrushSize, clampFeather,
  normalizeBrushShape, computeStrokeSteps,
  planHolographicScene, calculateSustainabilityEfficiency,
  consumeRuntimeAcceptanceEvidence
} from '../../src/index.js';
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
const modules = Object.freeze([
  { id:'auth', name:'Authentication & CORS', category:'Security', path:'./auth', description:'Authentication policy and validated origin handling', action:null },
  { id:'api', name:'API route validation', category:'Security', path:'./index', description:'Bounded request validation and structured failures', action:null },
  { id:'deploy', name:'Cloud Run preflight', category:'Deployment', path:'./cloud-run', description:'Credential-free deployment argument planning', action:'cloud' },
  { id:'runtime', name:'Runtime Acceptance', category:'Evidence', path:'./runtime-acceptance-consumer', description:'Verify durable receipts and fingerprints', action:'receipt' },
  { id:'holographic', name:'Holographic Scene Planning', category:'Spatial', path:'./holographic-scene-planner', description:'Advisory-only spatial scene plans with evidence', action:'holo' },
  { id:'sustainability', name:'Sustainability Efficiency', category:'Sustainability', path:'./index', description:'Evidence-aware energy and workload calculations', action:'energy' },
  { id:'frontend', name:'Erase & Mask Geometry', category:'Frontend', path:'./erase-mask', description:'Normalize brush size, shape, feather and stroke spacing', action:'brush' },
  { id:'bootstrap', name:'Application Bootstrap', category:'Runtime', path:'./application-bootstrap', description:'Package and readiness contract utilities', action:null },
  { id:'storage', name:'Cloud File Workflow', category:'Storage', path:'./index', description:'Validated cloud upload, signed URL and chat boundaries', action:null },
  { id:'observability', name:'Observability', category:'Reliability', path:'./json-logger', description:'Structured logging and bounded error reporting', action:null }
]);
function respond(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, {'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'",'X-Frame-Options':'DENY'});
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function runAction(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('Invalid workflow body');
  const v=body.inputs;if(!v||typeof v!=='object'||Array.isArray(v))throw new TypeError('Invalid inputs');
  switch(body.action){
    case 'cloud':return{status:'planned',advisoryOnly:true,executed:false,result:buildCloudRunDeployArgs({serviceName:v.serviceName,region:v.region||'us-central1',source:'.',envVarsFile:'run-env.yaml',allowUnauthenticated:false})};
    case 'brush':return{status:'computed',result:{brushSize:clampBrushSize(Number(v.brushSize)),shape:normalizeBrushShape(v.shape),feather:clampFeather(Number(v.feather)),strokeSteps:computeStrokeSteps({distance:Number(v.distance),brushSize:Number(v.brushSize)})}};
    case 'holo':return{status:'planned',advisoryOnly:true,executed:false,result:planHolographicScene({snapshotId:v.snapshotId,provenanceRef:v.provenanceRef,intent:v.intent,target:'web-dashboard',objects:[{id:'reference-object',kind:'asset',x:0,y:0,z:0}]})};
    case 'energy':return{status:'computed',derivedFrom:'user-supplied estimates',result:calculateSustainabilityEfficiency({durationMs:Number(v.durationMs),estimatedEnergyWh:Number(v.estimatedEnergyWh),renewableRatio:Number(v.renewableRatio)})};
    case 'receipt':return{status:'checked',authority:'none',result:consumeRuntimeAcceptanceEvidence({receipt:v.receipt,receiptFingerprint:v.receiptFingerprint,previousFingerprint:v.previousFingerprint||undefined})};
    default:throw new TypeError('Unsupported workflow');
  }
}
function summary(){const categories=[...new Set(modules.map(m=>m.category))].map(category=>({category,count:modules.filter(m=>m.category===category).length}));return{source:'maintained-library',moduleCount:modules.length,categories,quickActions:[{id:'studio',label:'Open Workflow Studio',description:'Run bounded library calculations',page:'studio'},{id:'modules',label:'Browse Module Library',description:'Inspect maintained capabilities',page:'modules'},{id:'evidence',label:'Verify Evidence',description:'Fail-closed receipt inspection',page:'evidence'},{id:'assets',label:'Open Asset Studio',description:'Review shipped ÆtherForge assets',page:'assets'}],boundary:{cloudMutations:false,aiProvider:false,localAdapterOnly:true,externalNetworkCalls:false}};}
export function createWorkbenchServer({assetRoot=process.env.AETHERFORGE_DATA_DIR||join(root,'.local-assets'),errorTracker=createHttpErrorTracker('aetherforge-workbench')}={}){return createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');
 const host=String(req.headers.host||'');
 const localHost=/^(?:127\.0\.0\.1|localhost)(?::[0-9]{1,5})?$/.test(host);
 const csName=String(process.env.CODESPACE_NAME||'');
 const csHost=process.env.CODESPACES==='true'&&/^[a-z0-9-]{1,90}$/.test(csName)?`${csName}-${Number(process.env.AETHERFORGE_PORT||4545)}.app.github.dev`:'';
 const privateForward=Boolean(csHost)&&host===csHost;
 if(!localHost&&!privateForward)return respond(res,403,{error:'Local or private Codespaces host required'});
 const origin=String(req.headers.origin||'');
 const allowedOrigins=[(privateForward?'https://':'http://')+host];
 // GitHub's private forwarder may rewrite Host to localhost while retaining browser Origin.
 if(localHost&&csHost)allowedOrigins.push('https://'+csHost);
 if(origin&&!allowedOrigins.includes(origin))return respond(res,403,{error:'Cross-origin requests are not accepted'});
 const fetchSite=String(req.headers['sec-fetch-site']||'');
 if(fetchSite==='cross-site')return respond(res,403,{error:'Cross-site requests are not accepted'});
 if(req.method==='GET'&&url.pathname==='/api/health')return respond(res,200,{adapter:'ready',source:'maintained-library',offline:false,canExecuteDeployments:false,aiConfigured:false});
 if(req.method==='GET'&&url.pathname==='/api/modules')return respond(res,200,{source:'canonical maintained exports',modules});
 if(req.method==='GET'&&url.pathname==='/api/workbench/summary')return respond(res,200,summary());
 if(req.method==='POST'&&url.pathname==='/api/run'){if(req.headers['content-type']?.split(';')[0]?.trim()!=='application/json')return respond(res,415,{error:'JSON content type required'});let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>64*1024){req.resume();return respond(res,413,{error:'Request exceeds limit'});}chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');try{return respond(res,200,runAction(workflowRequestSchema.parse(JSON.parse(raw))));}catch{return respond(res,422,{error:'Invalid workflow input. Review the required fields.'});}}
 if(req.method==='GET'&&url.pathname==='/api/assets')return respond(res,200,{assets:await listLocalAssets(assetRoot)});
 if(req.method==='GET'&&url.pathname.startsWith('/api/assets/')){const id=url.pathname.slice('/api/assets/'.length);if(!/^[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(id))return respond(res,404,{error:'Invalid asset'});try{const data=await getLocalAsset(assetRoot,id);return respond(res,200,data.bytes,data.mime);}catch{return respond(res,404,{error:'Asset not found'});}}
 if(req.method==='POST'&&url.pathname==='/api/assets/upload'){const mime=String(req.headers['content-type']||'').trim();let name;try{name=decodeURIComponent(String(req.headers['x-file-name']||'asset'));}catch{return respond(res,400,{error:'Invalid filename'});}const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>6*1024*1024)return respond(res,413,{error:'File too large'});chunks.push(chunk);}try{const item=await saveLocalAsset(assetRoot,Buffer.concat(chunks),name,mime);return respond(res,201,{asset:item});}catch{return respond(res,415,{error:'File type, signature or size not supported'});}}
 const asset=staticRoutes.get(url.pathname);if(req.method==='GET'&&asset){const file=await readFile(join(root,asset[0]));return respond(res,200,file,asset[1]);}return respond(res,404,{error:'Not found'});
 }catch(error){errorTracker.capture(error,req);return respond(res,500,{error:'Workbench request failed'});}});}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){const port=Number(process.env.AETHERFORGE_PORT||4545);const codespacesBind=process.env.CODESPACES==='true'&&process.env.AETHERFORGE_CODESPACES_BIND==='1';const host=codespacesBind?'0.0.0.0':'127.0.0.1';createWorkbenchServer().listen(port,host,()=>process.stdout.write('ÆtherForge ready at http://127.0.0.1:'+port+' ('+host+')\n'));}
