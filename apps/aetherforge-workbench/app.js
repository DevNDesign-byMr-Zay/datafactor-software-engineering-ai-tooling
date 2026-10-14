const REPO = 'https://github.com/DevNDesign-byMr-Zay/datafactor-software-engineering-ai-tooling';
const defaults = [
 ['auth','Authentication & CORS','Security','./auth','Token middleware and validated origin policy'],
 ['api','API route validation','Security','./index','Bounded request validation and failure reporting'],
 ['deploy','Cloud Run preflight','Deployment','./cloud-run','Credential-free deployment argument planning'],
 ['runtime','Runtime Acceptance','Evidence','./runtime-acceptance-consumer','Fingerprint-verified durable receipts'],
 ['holographic','Holographic Scene Planning','Spatial','./holographic-scene-planner','Advisory 3D scene plans with provenance'],
 ['sustainability','Sustainability Efficiency','Sustainability','./index','Energy and workload calculations based on supplied measurements'],
 ['frontend','Erase & Mask Geometry','Frontend','./erase-mask','Brush geometry, normalization and stroke spacing'],
 ['bootstrap','Application Bootstrap','Runtime','./application-bootstrap','Startup readiness and module contract utilities'],
 ['storage','Cloud File Workflow','Storage','./index','Safe upload, signed access and chat boundaries'],
 ['observability','Observability','Reliability','./json-logger','Structured logging and bounded error reporting']
].map(a=>({id:a[0],name:a[1],category:a[2],path:a[3],description:a[4]}));
const state = {page:'overview', connected:false, modules:defaults, activeModule:null, uploadAssets:[], referenceManifest:null, evidence:null, lastReport:null, search:''};
const titleMap={overview:'Overview',modules:'Module Library',studio:'Workflow Studio',evidence:'Evidence Center',sustainability:'Sustainability Lab',assets:'Asset Studio',assistant:'AI Assistant',settings:'Settings & About'};
const subMap={
 overview:'Your engineering cockpit · develop, verify and evolve with measurable confidence.',
 modules:'Discover every maintained module and explore its verified boundary.',
 studio:'Execute approved library calculations and produce advisory plans—not deployments.',
 evidence:'Upload a receipt, verify its fingerprint and export a verdict.',
 sustainability:'Calculate workload efficiency from explicitly supplied measurements.',
 assets:'Approved vector brand assets and session-only local image previews.',
 assistant:'Reference guidance grounded in known maintained exports—AI provider not configured.',
 settings:'Appearance, runtime availability and product safety boundaries.'
};
function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
function content(html,title,eyebrow='WORKBENCH',badge='MAINTAINED LIBRARY'){
 return '<div class="content"><div class="eyebrow">'+esc(eyebrow)+'</div><div class="page-head"><div><h1>'+esc(title)+'</h1><p>'+esc(subMap[state.page])+'</p></div><span class="pill">'+esc(badge)+'</span></div>'+html+'</div>';
}
function section(name,subtitle=''){return '<div class="section-title"><h3>'+esc(name)+'</h3><small>'+esc(subtitle)+'</small></div>';}
function tile(symbol,heading,description,page,theme=''){
 return '<button class="card card-button" data-goto="'+esc(page)+'"><span class="icon-tile '+theme+'">'+symbol+'</span><h4>'+esc(heading)+'</h4><p>'+esc(description)+'</p><span class="card-foot">OPEN WORKSPACE <b>↗</b></span></button>';
}
function overview(){
 const n=state.modules.length;
 return content(
 '<div class="hero"><div><div class="eyebrow">BUILD · VERIFY · AUTOMATE · EVOLVE</div><h2>ENGINEER THE<br><span>NEXT POSSIBILITY.</span></h2><p>Explore real reusable software modules, validate critical contracts and export trustworthy results. A powerful visual layer over the protected library.</p><div class="hero-actions"><button class="btn" data-goto="studio">Open Workflow Studio →</button><button class="btn secondary" data-goto="modules">Explore Modules</button></div></div><div class="hero-diagram"><div class="orbital"></div><img src="./assets/aetherforge-emblem.svg" alt="ÆtherForge orbital emblem"></div></div>'+
 section('Platform at a glance','Truthful runtime indicators')+
 '<div class="grid four"><div class="card"><div class="metric"><h4>Maintained modules</h4><span class="icon-tile blue">⬡</span></div><b style="font-size:29px">'+n+'</b><p>Capabilities in the documented catalog</p></div><div class="card"><div class="metric"><h4>Local adapter</h4><span class="icon-tile mint">↯</span></div><b style="font-size:22px">'+(state.connected?'Connected':'Offline')+'</b><p>Real library functions only when connected</p></div><div class="card"><div class="metric"><h4>Runtime boundary</h4><span class="icon-tile violet">⛨</span></div><b style="font-size:22px">Advisory</b><p>No cloud deployment or mutation authority</p></div><div class="card"><div class="metric"><h4>AI provider</h4><span class="icon-tile">✧</span></div><b style="font-size:22px">Not configured</b><p>Local reference guide available</p></div></div>'+
 section('Core workspaces','Choose a capability')+
 '<div class="grid three">'+tile('⬡','Module Library','Browse actual library capabilities and public entrypoints.','modules')+tile('⌘','Workflow Studio','Use real planning and validation functions on the local server.','studio','violet')+tile('⛨','Evidence Center','Verify a supplied receipt against its claimed fingerprint.','evidence','mint')+tile('◈','Sustainability Lab','Compare workload inputs with explicit units and no invented telemetry.','sustainability')+tile('▣','Asset Studio','Preview approved icon/logo files and local artwork.','assets','violet')+tile('✧','Engineering Guide','Get a contextual offline reference to the tool boundaries.','assistant','blue')+'</div>'+
 section('How it works','An explicit boundary between planning and action')+
 '<div class="panel"><div class="pipeline"><span class="phase">DISCOVER</span><span class="arrow">→</span><span class="phase">CONFIGURE</span><span class="arrow">→</span><span class="phase">VALIDATE</span><span class="arrow">→</span><span class="phase">RECEIPT</span></div><div class="callout"><b>NO REGRESSION</b> · The canonical library, historical archive, root dependency model, test thresholds and package exports are not rewritten by this companion interface.</div></div>','ENGINEERING CONTROL');
}
function moduleList(){
 const query=state.search.toLowerCase().trim();
 const filtered=state.modules.filter(m=>(m.name+' '+m.category+' '+m.description+' '+m.path).toLowerCase().includes(query));
 return filtered.map(m=>'<button class="module-row" data-module="'+esc(m.id)+'"><span class="icon-tile">⬡</span><span><strong>'+esc(m.name)+'</strong><small>'+esc(m.description)+'</small></span><em>'+esc(m.category)+' ↗</em></button>').join('')||'<p class="empty">No matching modules. Clear the search to browse the full library.</p>';
}
function detail(){
 const m=state.modules.find(x=>x.id===state.activeModule);
 if(!m)return '<div class="detail-box"><strong>Select a module</strong><p>Choose any entry above to inspect its purpose and package path.</p></div>';
 return '<div class="detail-box"><span class="eyebrow">'+esc(m.category)+'</span><h3>'+esc(m.name)+'</h3><p>'+esc(m.description)+'</p><p class="subtext">Canonical export path</p><div class="code">'+esc(m.path)+'</div><div class="toolbar"><button class="btn small" data-goto="studio">Open Studio →</button><a href="'+REPO+'/blob/main/src/index.js" target="_blank" rel="noreferrer">Inspect source exports ↗</a></div></div>';
}
function modules(){
 return content('<div class="panel"><div class="toolbar"><input class="search-field" id="moduleSearch" type="search" aria-label="Filter modules" placeholder="Search by capability, path or category" value="'+esc(state.search)+'"><span class="pill cyan">'+state.modules.length+' documented entries</span></div><div id="moduleList">'+moduleList()+'</div><div id="moduleDetail">'+detail()+'</div><p class="subtext row-gap">The catalog describes actual maintained package boundaries. Listing a module does not imply it can perform live cloud operations.</p></div>','Module Library','DISCOVER COMPONENTS','CANONICAL EXPORTS');
}
function form(title,desc,rows,action){
 let html='<section class="panel"><div class="eyebrow">MAINTAINED LIBRARY FUNCTION</div><h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p><div class="formgrid row-gap">';
 rows.forEach(r=>{html+='<div class="formrow '+(r.wide?'span2':'')+'"><label for="'+r.id+'">'+esc(r.label)+'</label>';
  if(r.type==='select'){html+='<select class="field" id="'+r.id+'">'+r.options.map(o=>'<option>'+esc(o)+'</option>').join('')+'</select>';}
  else{html+='<input class="field" id="'+r.id+'" type="'+(r.type||'text')+'" value="'+esc(r.value??'')+'" '+(r.min!==undefined?'min="'+r.min+'" ':'')+' '+(r.max!==undefined?'max="'+r.max+'" ':'')+'required>';}
  html+='</div>';});
 return html+'</div><div class="toolbar"><button class="btn" data-run="'+action+'">Run library validation →</button><span class="subtext">No provider execution</span></div></section>';
}
function studio(){
 return content(
 '<div class="callout"><b>Execution policy:</b> only bounded, read-only computations run. Cloud Run generates argument plans, holographic actions produce advisory scenes, and frontend tools compute geometry. A disconnected adapter cannot provide real library results.</div>'+
 '<div class="grid two row-gap">'+
 form('Cloud Run deployment preflight','Generates proposed CLI arguments. Does not deploy, read credentials, change traffic or contact cloud providers.',[{id:'serviceName',label:'Service identifier',value:'aetherforge-example'},{id:'region',label:'Cloud region',value:'us-central1'}],'cloud')+
 form('Frontend brush geometry','Calculate normalized brush size, feather and spacing from real library helpers.',[{id:'brushSize',label:'Brush size',type:'number',value:'64',min:'1'},{id:'distance',label:'Stroke distance',type:'number',value:'120',min:'0'},{id:'feather',label:'Feather',type:'number',value:'14',min:'0'},{id:'shape',label:'Shape',type:'select',options:['circle','square','tri']}],'brush')+
 form('Holographic scene planning','Creates renderer-neutral scene and evidence objects. Planning only; does not actuate or mutate.',[{id:'snapshotId',label:'Snapshot ID',value:'design-001'},{id:'provenanceRef',label:'Provenance reference',value:'user-provided-01'},{id:'intent',label:'Operator intent',value:'Inspect a selected reference object',wide:true}],'holo')+
 '<div class="panel"><div class="eyebrow">EXECUTION RESULTS</div><h3>Verified library output</h3><p>Run a workflow to see the exact returned structure from the maintained module.</p><pre class="outbox" id="workflowOutput">Awaiting input. No workflow has been executed.</pre><div class="toolbar"><button class="btn secondary small" data-download="report">Download result JSON ↓</button></div><span class="state" id="workflowState">Ready to validate local input</span></div></div>',
 'Workflow Studio','CONFIGURE · VALIDATE · INSPECT','READ-ONLY');
}
function evidence(){
 return content('<div class="grid two"><section class="panel"><div class="eyebrow">TRUSTED EVIDENCE</div><h3>Runtime Acceptance Inspector</h3><p>Supply your actual receipt and 64-character fingerprint. The existing library verifies its identity before classifying changed or unchanged.</p><div class="toolbar"><label class="upload-zone" style="flex:1"><span class="icon-tile">⇧</span><strong>Load a JSON evidence file</strong><span>Local read only · not stored server-side</span><input type="file" id="receiptFile" accept=".json,application/json"></label></div><div class="formrow"><label for="receiptText">Receipt JSON</label><textarea class="field" id="receiptText" spellcheck="false" placeholder="{ &quot;accepted&quot;: true, ... }"></textarea></div><div class="formgrid row-gap"><div class="formrow"><label for="receiptFingerprint">Current fingerprint (64 hex characters)</label><input class="field" id="receiptFingerprint" placeholder="sha256 fingerprint" maxlength="64"></div><div class="formrow"><label for="previousFingerprint">Previous fingerprint (optional)</label><input class="field" id="previousFingerprint" placeholder="Optional previous trusted fingerprint" maxlength="64"></div></div><div class="toolbar"><button class="btn" id="verifyEvidence">Verify uploaded evidence →</button></div></section><section class="panel"><div class="eyebrow">PROVENANCE IS REQUIRED</div><h3>Verification result</h3><p>Failed identity or unsupported inputs reject safely. A successful verdict does not authorize deployment.</p><pre class="outbox" id="evidenceOutput">No evidence evaluated.</pre><div class="toolbar"><button class="btn secondary small" data-download="report">Download verdict ↓</button></div><div class="callout row-gap"><b>Important:</b> a green tick is never a substitute for an actual verified source receipt, cryptographic identity, and correct authority boundary.</div></section></div>','Evidence Center','PROOF · PROVENANCE · VERIFICATION','FAIL CLOSED');
}
function sustainability(){
 return content('<div class="grid two"><section class="panel"><div class="eyebrow">USER-SUPPLIED METRICS</div><h3>Workload Efficiency Calculator</h3><p>Use measured or estimated energy with transparent units. Calculations come from the maintained sustainability export.</p><div class="formgrid row-gap"><div class="formrow"><label for="durationMs">Duration (milliseconds)</label><input class="field" type="number" min="0" id="durationMs" value="12000"></div><div class="formrow"><label for="estimatedEnergyWh">Energy (watt-hours)</label><input class="field" type="number" min="0" id="estimatedEnergyWh" value="3.4"></div><div class="formrow"><label for="renewableRatio">Renewable fraction (0 to 1)</label><input class="field" type="number" min="0" max="1" step=".01" id="renewableRatio" value=".35"></div></div><div class="toolbar"><button class="btn" data-run="energy">Calculate efficiency →</button></div><p class="subtext">This is not real-time telemetry and does not prove carbon savings.</p></section><section class="panel"><div class="eyebrow">OUTPUT · INTERPRETATION</div><h3>Evidence-based impact</h3><pre class="outbox" id="workflowOutput">Enter the workload measurements and select Calculate.</pre><div class="toolbar"><button class="btn secondary small" data-download="report">Download JSON ↓</button></div><span class="state" id="workflowState">No result yet</span><div class="callout row-gap"><b>Method:</b> energy per second in Wh/s = estimated Wh ÷ elapsed seconds; renewable-adjusted energy Wh = Wh × (1 − supplied renewable fraction).</div></section></div>','Sustainability Lab','MEASURE · CALCULATE · EXPLAIN','EVIDENCE-BASED');
}
function assetCards(){
 const shipped=[['Primary logo','./assets/aetherforge-logo.svg','Scalable vector'],['Orbit emblem','./assets/aetherforge-emblem.svg','Scalable vector'],['Application icon','./assets/aetherforge-icon.svg','Scalable vector']];
 return shipped.map(m=>'<div class="asset-card"><img src="'+m[1]+'" alt="'+esc(m[0])+'"><div><strong>'+esc(m[0])+'</strong><small>'+esc(m[2])+'</small><a href="'+m[1]+'" download>Download SVG ↓</a></div></div>').join('')+
 state.uploadAssets.map((a,i)=>'<div class="asset-card"><img src="'+a.url+'" alt="Session preview '+(i+1)+'"><div><strong>'+esc(a.name)+'</strong><small>Local session preview · '+Math.round(a.bytes/1024)+' KB</small></div></div>').join('');
}
function assets(){
 const uncommitted = state.referenceManifest?.sources || [];
 const registered = uncommitted.length ? '<div class="panel row-gap"><h3>Original raster source registry</h3><p>All six uploaded references are fingerprint-inventoried. Their original PNG bytes are not yet in GitHub; the vectors above are shipped and usable today.</p><div class="module-list">'+uncommitted.map(f=>'<div class="module-row" style="cursor:default"><span class="icon-tile">▣</span><span><strong>'+esc(f.role.replaceAll('-',' '))+'</strong><small>'+esc(f.name)+'</small></span><em style="color:var(--orange)">Pending PNG</em></div>').join('')+'</div></div>':'';
 return content('<div class="panel"><img class="brand-lockup" src="./assets/aetherforge-logo.svg" alt="ÆtherForge wordmark"><h3>Approved visual direction</h3><p>Gunmetal-silver structure, electric cyan precision, violet orbital intelligence and midnight-blue system surfaces.</p><div class="brand-system"><div class="swatch" style="background:#081223">#081223</div><div class="swatch" style="background:#0D1E3A">#0D1E3A</div><div class="swatch" style="background:#27D6FF;color:#051124">#27D6FF</div><div class="swatch" style="background:#3A88FF">#3A88FF</div><div class="swatch" style="background:#8A5CFF">#8A5CFF</div><div class="swatch" style="background:#5B6E91">#5B6E91</div></div></div>'+
 section('Shipped vector assets','Each image is included within this interface')+
 '<div class="preview-grid" id="assetGrid">'+assetCards()+'</div>'+registered+
 section('Local preview uploads','No file is transmitted or persisted')+
 '<label class="upload-zone"><span class="icon-tile">⇧</span><strong>Choose images to preview</strong><span>PNG, JPEG or WebP · 6 MiB maximum · local adapter stores securely on your device</span><input type="file" id="assetUpload" accept="image/png,image/jpeg,image/webp" multiple></label><div class="callout row-gap"><b>Assets vs runtime:</b> the three vector SVGs are shipped with the app. When the local server is connected, user-selected images persist in its private local data folder; without it, they are session-only. No cloud upload is enabled.</div>',
 'Asset Studio','LOGO · EMBLEM · APPLICATION ICON','SESSION PREVIEW');
}
function assistant(){
 return content('<div class="grid two"><section class="panel"><div class="eyebrow">LOCAL GUIDANCE ENGINE</div><h3>ÆtherForge Engineering Guide</h3><p>Search documented capabilities using deterministic matching. This is not a generative AI provider and cannot modify repositories or execute commands.</p><div class="formrow row-gap"><label for="guideInput">What do you want to build or verify?</label><textarea class="field" id="guideInput" placeholder="Example: I need to verify a runtime acceptance receipt"></textarea></div><div class="toolbar"><button class="btn" id="askGuide">Find relevant modules →</button></div></section><section class="panel"><div class="eyebrow">SOURCE-BASED SUGGESTIONS</div><h3>Module references</h3><div id="guideOutput" class="outbox">Ask about authentication, deployment planning, runtime receipts, holograms, masking, storage or sustainability.</div><div class="callout row-gap"><b>AI integration:</b> an actual model provider must be configured behind an authenticated server endpoint before live AI responses can be claimed.</div></section></div>','Engineering Guide','REFERENCE · DISCOVER','OFFLINE RULES');
}
function settings(){
 return content('<div class="grid two"><div class="panel"><h3>Appearance & accessibility</h3><p>Choose your visual mode. Reduced motion follows your OS preference automatically.</p><div class="toolbar"><button class="btn secondary" id="themeInSettings">Switch dark/light mode</button></div><h3 class="row-gap">Brand specification</h3><p>Display: geometric Orbitron-style capitals. UI: Inter-style modern sans. System fallback fonts keep the offline package usable.</p><img src="./assets/aetherforge-emblem.svg" alt="ÆtherForge emblem" style="max-height:210px;max-width:90%;display:block;margin:14px auto"></div><div class="panel"><h3>Security & integration scope</h3><p>The current UI is a local companion and not a new backend service or infrastructure provisioning platform.</p><div class="row-gap callout"><b>Server:</b> '+(state.connected?'Connected to localhost Node adapter':'Disconnected; open with the Node adapter for real operations')+'</div><div class="row-gap callout"><b>Privacy:</b> local image selections are not uploaded; JSON validation is performed on localhost when connected. Do not submit secrets.</div><div class="row-gap callout"><b>Integrity:</b> root CI and provenance remain outside this feature branch until PR gates are confirmed.</div><div class="toolbar"><a href="'+REPO+'" target="_blank" rel="noopener noreferrer">Review source repository ↗</a></div></div></div>',
 'Settings & About','APPEARANCE · SECURITY · INFO','NO REGRESSION');
}
const pages={overview,modules,studio,evidence,sustainability,assets,assistant,settings};
function render(){
 document.querySelector('#crumbName').textContent=titleMap[state.page].toUpperCase();
 document.querySelector('#main').innerHTML=pages[state.page]();
 document.querySelectorAll('[data-page]').forEach(b=>{const selected=b.dataset.page===state.page;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
}
function go(page){if(!pages[page])return;state.page=page;render();scrollTo({top:0,behavior:'instant'});}
function showToast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3600);}
function value(id){return document.getElementById(id)?.value||'';}
async function action(actionName){
 const fields={cloud:['serviceName','region'],brush:['brushSize','distance','feather','shape'],holo:['snapshotId','provenanceRef','intent'],energy:['durationMs','estimatedEnergyWh','renewableRatio']};
 const inputs={};
 for(const k of fields[actionName]||[])inputs[k]=value(k);
 await execute(actionName,inputs);
}
async function execute(name,inputs){
 if(!state.connected){showToast('Connect the localhost adapter to execute maintained library functions.');return;}
 const area=document.querySelector('#workflowOutput')||document.querySelector('#evidenceOutput');
 if(area)area.textContent='Validating with the maintained library…';
 try{
  const response=await fetch('/api/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:name,inputs})});
  const payload=await response.json();
  if(!response.ok)throw new Error(payload.error||'Validation refused');
  state.lastReport={date:new Date().toISOString(),action:name,source:'maintained-library',...payload};
  if(area)area.textContent=JSON.stringify(payload,null,2);
  const status=document.querySelector('#workflowState');if(status){status.textContent='Library function completed · no side effects';status.className='state good';}
  showToast('Received library result — no deployment executed.');
 }catch(error){if(area)area.textContent='Validation was refused: '+error.message;const status=document.querySelector('#workflowState');if(status){status.textContent='No valid result';status.className='state bad';}}
}
function saveReport(){
 if(!state.lastReport){showToast('Run a validation first.');return;}
 const blob=new Blob([JSON.stringify(state.lastReport,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='aetherforge-'+state.lastReport.action+'-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
async function loadEvidence(file){
 if(!file)return;
 if(file.size>64*1024){showToast('Receipt file exceeds the 64KB local validation limit.');return;}
 try{const obj=JSON.parse(await file.text());state.evidence=obj;document.querySelector('#receiptText').value=JSON.stringify(obj.receipt??obj,null,2);if(typeof obj.receiptFingerprint==='string')document.querySelector('#receiptFingerprint').value=obj.receiptFingerprint;if(typeof obj.previousFingerprint==='string')document.querySelector('#previousFingerprint').value=obj.previousFingerprint;showToast('Evidence loaded locally. Press Verify to run the real checker.');}
 catch{showToast('This file does not contain valid JSON.');}
}
async function verifyEvidence(){
 let receipt;try{receipt=JSON.parse(value('receiptText'));}catch{showToast('Paste a valid JSON receipt.');return;}
 await execute('receipt',{receipt,receiptFingerprint:value('receiptFingerprint'),previousFingerprint:value('previousFingerprint')});
}
async function loadAssets(files){
 const allowed=new Set(['image/png','image/jpeg','image/webp']);
 let count=0;
 for(const f of files){
  if(!allowed.has(f.type)||f.size>6*1024*1024){showToast('Please choose a PNG, JPEG or WebP under 6 MiB.');continue;}
  if(state.connected){
   try{const result=await fetch('/api/assets/upload',{method:'POST',headers:{'content-type':f.type,'x-file-name':encodeURIComponent(f.name)},body:f});if(!result.ok)throw new Error('Upload was rejected');const data=await result.json();if(!state.uploadAssets.some(x=>x.url===data.asset.url))state.uploadAssets.push({name:data.asset.name,url:data.asset.url,bytes:data.asset.size});count++;}
   catch{showToast('Image could not be stored locally.');}
  }else{state.uploadAssets.push({name:f.name,url:URL.createObjectURL(f),bytes:f.size});count++;}
 }
 state.page='assets';render();if(count)showToast(state.connected?'Images stored in local ÆtherForge data folder.':'Temporary preview only — start local server for persistence.');
}
function guide(){
 const q=value('guideInput').toLowerCase();if(!q.trim()){showToast('Enter an engineering question.');return;}
 const hints=[
 [['auth','cors','security','login','token'],['auth','api']],
 [['cloud','deploy','release','traffic'],['deploy','runtime']],
 [['receipt','fingerprint','evidence','provenance'],['runtime']],
 [['holo','scene','spatial','4d'],['holographic']],
 [['energy','sustain','efficiency','wh'],['sustainability']],
 [['mask','brush','erase','frontend'],['frontend']],
 [['error','logging','observ'],['observability']],
 [['upload','file','storage','signed'],['storage']],
 [['bootstrap','health','readiness'],['bootstrap']]
 ];
 let ids=[];for(const [keys,modules] of hints){if(keys.some(k=>q.includes(k)))ids.push(...modules);}
 ids=[...new Set(ids)];if(!ids.length)ids=['auth','runtime','holographic','sustainability'];
 const relevant=state.modules.filter(m=>ids.includes(m.id));
 document.querySelector('#guideOutput').textContent='Deterministic module suggestions (not AI-generated):\n\n'+relevant.map(m=>'• '+m.name+'\n  '+m.description+'\n  Package: '+m.path).join('\n\n')+'\n\nReview source documentation before taking actions.';
}
function toggleTheme(){
 const light=document.body.classList.toggle('light');
 try{localStorage.setItem('aetherforge-theme',light?'light':'dark');}catch{}
}
document.addEventListener('click',event=>{
 const el=event.target.closest('button,a');if(!el)return;
 if(el.dataset.page)go(el.dataset.page);
 else if(el.dataset.goto)go(el.dataset.goto);
 else if(el.dataset.module){state.activeModule=el.dataset.module;const detailEl=document.querySelector('#moduleDetail');if(detailEl)detailEl.innerHTML=detail();}
 else if(el.dataset.run)action(el.dataset.run);
 else if(el.dataset.download)saveReport();
 else if(el.id==='verifyEvidence')verifyEvidence();
 else if(el.id==='askGuide')guide();
 else if(el.id==='themeButton'||el.id==='themeInSettings')toggleTheme();
});
document.addEventListener('input',event=>{
 if(event.target.id==='moduleSearch'||event.target.id==='globalSearch'){
  state.search=event.target.value;
  if(event.target.id==='globalSearch'){if(state.page!=='modules')go('modules');const field=document.querySelector('#moduleSearch');if(field)field.value=state.search;}
  const list=document.querySelector('#moduleList');if(list)list.innerHTML=moduleList();
 }
});
document.addEventListener('change',event=>{
 if(event.target.id==='assetUpload')loadAssets([...event.target.files]);
 if(event.target.id==='receiptFile')loadEvidence(event.target.files[0]);
});
document.addEventListener('keydown',event=>{
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();document.querySelector('#globalSearch').focus();}
 if(event.key==='Escape'&&document.activeElement===document.querySelector('#globalSearch'))document.activeElement.blur();
});
async function boot(){
 try{if(localStorage.getItem('aetherforge-theme')==='light')document.body.classList.add('light');}catch{}
 render();
 try{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),1800);
  const [health,catalog]=await Promise.all([fetch('/api/health',{signal:controller.signal}),fetch('/api/modules',{signal:controller.signal})]);clearTimeout(timeout);
  if(!health.ok||!catalog.ok)throw new Error('Adapter unavailable');
  const h=await health.json();const m=await catalog.json();
  if(h.adapter!=='ready'||!Array.isArray(m.modules))throw new Error('Invalid adapter response');
  state.connected=true;state.modules=m.modules;
  try{const stored=await fetch('/api/assets',{signal:controller.signal});if(stored.ok)state.uploadAssets=(await stored.json()).assets.map(x=>({name:x.name,url:x.url,bytes:x.size}));}catch{}
  try{const refResponse=await fetch('/assets/reference-manifest.json',{signal:controller.signal});if(refResponse.ok)state.referenceManifest=await refResponse.json();}catch{}
 }catch{state.connected=false;state.modules=defaults;}
 const badge=document.querySelector('#connectionBadge'),foot=document.querySelector('#sidebarStatus'),dot=document.querySelector('#sidebarDot');
 badge.textContent=state.connected?'LOCAL ADAPTER CONNECTED':'OFFLINE PREVIEW';badge.classList.toggle('online',state.connected);
 foot.textContent=state.connected?'Local library adapter ready':'Local adapter disconnected';dot.classList.toggle('online',state.connected);
 render();
}
boot();
