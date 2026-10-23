/* ÆTHERFORGE Engineering IDE: local project files, versioned export and isolated browser preview. */
(()=>{'use strict';const core=window.AetherForgeIDECore;const KEY='aetherforge-ide-workspace-v1',ID_KEY='aetherforge-ide-project-id-v1';let project,active='index.html',consoleLines=[],runToken='',remoteSaveTimer=0,editSaveTimer=0,projectId=localStorage.getItem(ID_KEY)||newId();
 const backend=()=>typeof location!=='undefined'&&window.AetherForgeCloud?.isSupportedOrigin(location)===true;
 function newId(){return 'project_'+Math.random().toString(36).slice(2,12)+Date.now().toString(36);}
 function saveId(){try{localStorage.setItem(ID_KEY,projectId);}catch{}}
 async function writeRemote(){if(!backend())return;try{const res=await fetch('/api/workspace/projects/'+encodeURIComponent(projectId),{method:'PUT',headers:{'content-type':'application/json','x-aetherforge-local':'1'},body:JSON.stringify(core.validate(project))});if(!res.ok)throw Error('Project was not stored');const pill=document.getElementById('afidePersistence');if(pill)pill.textContent='BROWSER + SERVER SAVED';}catch{const pill=document.getElementById('afidePersistence');if(pill)pill.textContent='DEVICE ONLY · EXPORT BACKUP';}}
 function queueRemote(){if(!backend())return;clearTimeout(remoteSaveTimer);remoteSaveTimer=setTimeout(writeRemote,700);}

 const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
 const notify=s=>{if(window.showToast)window.showToast(s);else{const t=document.getElementById('toast');if(t)t.textContent=s;}};
 const download=(source,name,mime='application/json')=>{const url=URL.createObjectURL(new Blob([source],{type:mime}));const a=document.createElement('a');a.download=name;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1800);};
 try{project=core.validate(JSON.parse(localStorage.getItem(KEY)));}catch{project=core.starter();}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(project));saveId();queueRemote();return true;}catch{notify('Local storage unavailable or full. Export this project as JSON.');return false;}}
 function info(){const names=Object.keys(project.files);return `<span>${names.length} FILES</span> <span>REV ${project.revision}</span> <span>LOCAL WORKSPACE</span>`;}
 function render(){const paths=Object.keys(project.files).sort(),present=Object.hasOwn(project.files,active);if(!present)active=project.entry;
  return `<div class="content afide"><div class="eyebrow">ÆTHERFORGE / ENGINEERING ENVIRONMENT</div><div class="page-head"><div><h1>Engineering IDE</h1><p>A multi-file development environment for authorized, editable source and browser-safe previews.</p></div><span class="pill cyan">LOCAL · EDITABLE</span></div><div class="afide-top"><input id="afideName" maxlength="140" value="${esc(project.name)}" aria-label="Project name"><div class="afide-toolbar"><button class="btn" data-afide="run">▶ Run Viewport</button><button class="btn secondary" data-afide="add">＋ Add File</button><button class="btn secondary" data-afide="browse">Saved Projects</button><button class="btn secondary" data-afide="upload">↑ Upload Code Files</button><button class="btn secondary" data-afide="import">Import Project ZIP / JSON</button><button class="btn secondary" data-afide="zip">Export Project ZIP ↓</button><button class="btn secondary" data-afide="export">Export JSON ↓</button></div></div><div class="afide-status">${info()} <span id="afidePersistence">${backend()?'LOCAL/CLOUD SERVER READY':'OFFLINE MODE'}</span></div><div id="afideSavedPanel" class="afide-saved-panel" hidden></div><div class="afide-layout"><aside class="afide-tree"><strong>PROJECT EXPLORER</strong><p>Current project · source copies only</p>${paths.map(path=>`<button class="afide-file ${path===active?'active':''}" data-afide-open="${esc(path)}"><span>◇</span><b>${esc(path)}</b><small>${esc(core.runtime(path))}</small></button>`).join('')}<div class="afide-tree-footer"><button class="af-mini-btn" data-afide="rename">Rename</button><button class="af-mini-btn" data-afide="delete">Delete</button><button class="af-mini-btn" data-afide="new">New project</button></div></aside><section class="afide-editor"><div class="afide-editor-header"><span>${esc(active)}</span><small>${/\.(?:py|mjs|cjs)$/i.test(active)?'ISOLATED CLOUD DOCKER · MANUAL':core.runtime(active)==='reference'?'EDIT / EXPORT ONLY':core.runtime(active)==='js'?'BROWSER JS · DOCKER OPTION':'BROWSER RUNTIME SUPPORTED'}</small></div><textarea id="afideCode" class="afide-code" spellcheck="false" aria-label="Source editor: ${esc(active)}">${esc(project.files[active])}</textarea><div class="afide-editor-bottom"><span>Changes saved locally · Ctrl+S to save</span><button class="af-mini-btn" data-afide="download">Download File</button></div></section><section class="afide-viewport"><div class="afide-editor-header"><span>ISOLATED VIEWPORT</span><small>NO NETWORK · NO SERVER EXECUTION</small></div><iframe id="afidePreview" title="ÆtherForge isolated engineering preview" src="./sandbox-frame.html" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe><div id="afideConsole" role="log" aria-live="polite" class="afide-console">Upload or edit .html, .css and browser .js files, then choose Run Viewport. TypeScript, Python and other sources remain editable; Node/Python require verified Docker runtime where available.</div><div class="afide-runner"><div class="afide-runner-head"><strong>ISOLATED CODE RUNNER</strong><small>DOCKER ONLY · MANUAL EXECUTION</small></div><div class="afide-runner-controls"><select id="afideRunLanguage" aria-label="Sandbox execution runtime"><option value="node">Node.js</option><option value="python">Python</option></select><button class="af-mini-btn" data-afide="execute">Run Project Entry</button></div><pre id="afideExecOutput" role="status" aria-live="polite">Executes the selected .js/.mjs/.cjs or .py entry with eligible sibling files inside Docker. No network, host-folder mounts, or host-code fallback.</pre></div></section></div><div class="afide-foot">Export either a complete editable source ZIP (with original folders and files) or a versioned project JSON. Preview runs only browser HTML/CSS/JS within a sandboxed opaque-origin frame. It does not execute Node, Python, npm scripts, shell commands, deployment tools or untrusted dependencies. No AI-generated code is executed automatically.</div><input id="afideProjectFile" type="file" accept=".json,.zip,application/json,application/zip" hidden><input id="afideSourceFiles" type="file" multiple accept=".html,.htm,.css,.scss,.js,.mjs,.cjs,.jsx,.ts,.tsx,.py,.json,.md,.txt,.svg,.yml,.yaml,.xml,.sql,.sh,.ps1,.cmd,.java,.go,.rs,.rb,.php,.vue,.svelte,.c,.h,.cpp,.cs" hidden></div>`;
 }
 function refresh(){if(document.getElementById('afideCode')&&document.querySelector('[data-page="ide"]')?.classList.contains('active'))document.querySelector('#main').innerHTML=render();}
 function sync(){const editor=document.getElementById('afideCode');if(editor&&editor.value!==project.files[active]){try{project=core.edit(project,active,editor.value);save();}catch(e){notify(e.message);return false;}}const n=document.getElementById('afideName');if(n&&n.value.trim()&&n.value.length<=140&&project.name!==n.value.trim()){project.name=n.value.trim();save();}return true;}
 function openFile(path){if(!Object.hasOwn(project.files,path))return;if(!sync())return;active=path;refresh();}
 function run(){if(!sync())return;const iframe=document.getElementById('afidePreview');if(!iframe)return;if(core.runtime(active)==='reference'){const out=document.getElementById('afideConsole');if(out)out.textContent='This file type is editable but not browser-executable. Preview an .html file or run Node/Python via the optional Docker runner. No code was executed.';return;}const f=core.previewFiles(project,active);const token=String(Date.now())+'-'+Math.random().toString(36).slice(2);runToken=token;consoleLines=[];const out=document.getElementById('afideConsole');if(out)out.textContent='Browser preview dispatched. Unsupported code types are not executed.\n';iframe.contentWindow?.postMessage({type:'aetherforge-sandbox-run',token,files:{html:f.html,css:f.css,js:f.js,projectFiles:f.projectFiles,entry:f.entry}},'*');}
 function importCode(source){if(!source||typeof source.content!=='string')return;const path=String(source.name||'imported.txt').replace(/^.*[\\/]/,'').replace(/[^a-zA-Z0-9_.-]/g,'_');if(!core.validPath(path)){notify('Choose a supported text/code source.');return;}const target=Object.hasOwn(project.files,path)?'imports/'+path:path;try{sync();project=core.edit(project,target,source.content);active=target;save();document.querySelector('[data-page="ide"]')?.click();refresh();notify('Imported an editable source copy into Engineering IDE.');}catch(e){notify(e.message);}}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-afide],[data-afide-open]');if(!b)return;if(b.dataset.afideOpen)return openFile(b.dataset.afideOpen);const cmd=b.dataset.afide;
  if(cmd==='browse')return browseSaved();if(cmd==='execute')return executeActive();
  if(cmd==='run')return run();if(cmd==='zip'){try{if(!sync())return;const bytes=window.AetherForgeProjectZip.exportProject(project,core.validate);const name=(project.name.replace(/[^\w.-]+/g,'-').slice(0,70)||'aetherforge')+'.zip';const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Complete editable source ZIP exported.');}catch(e){notify('ZIP export failed: '+e.message);}return;}if(cmd==='export'){sync();return download(JSON.stringify(core.validate(project),null,2),(project.name.replace(/[^\w.-]+/g,'-').slice(0,70)||'aetherforge')+'.project.json');}if(cmd==='download'){sync();return download(project.files[active],active.split('/').at(-1),'text/plain');}
  if(cmd==='import')return document.getElementById('afideProjectFile')?.click();if(cmd==='upload')return document.getElementById('afideSourceFiles')?.click();
  if(cmd==='add'){const path=prompt('New file path (e.g. components/card.js):','components/component.js');if(path===null)return;if(!core.validPath(path)||Object.hasOwn(project.files,path))return notify('Invalid or duplicate file path.');try{sync();project=core.edit(project,path,'');active=path;save();refresh();}catch(e){notify(e.message);}return;}
  if(cmd==='rename'){const path=prompt('Rename file:',active);if(path===null)return;try{sync();project=core.rename(project,active,path);active=path;save();refresh();}catch(e){notify(e.message);}return;}
  if(cmd==='delete'){if(!confirm('Remove this file from the local project?'))return;try{project=core.remove(project,active);active=project.entry;save();refresh();}catch(e){notify(e.message);}return;}
  if(cmd==='new'){if(!confirm('Start a new project? Export the current project first if you need a backup.'))return;project=core.starter();projectId=newId();active=project.entry;save();refresh();}
 });
 document.addEventListener('change',async e=>{if(e.target?.id==='afideSourceFiles'){const files=[...e.target.files].slice(0,core.MAX_FILES);e.target.value='';await uploadSources(files);return;}if(e.target?.id!=='afideProjectFile')return;const file=e.target.files?.[0];if(!file||file.size>2e6)return notify('Project file exceeds 2MB.');try{const imported=/\.zip$/i.test(file.name)?window.AetherForgeProjectZip.importProject(await file.arrayBuffer(),core.validate,file.name.replace(/\.zip$/i,'')):core.validate(JSON.parse(await file.text()));project=imported;projectId=newId();active=project.entry;save();refresh();notify('Validated editable project imported. Nothing executed.');}catch(err){notify('Project import rejected: '+err.message);}e.target.value='';});
 async function uploadSources(files){
  if(!files.length)return;if(!sync())return;
  let ok=0,errors=[];
  for(const file of files){
   const name=String(file.webkitRelativePath||file.name).replaceAll('\\','/');
   if(!core.validPath(name)||file.size>core.MAX_SOURCE){errors.push(name+' (unsupported or too large)');continue;}
   try{const text=await file.text();if(text.includes('\u0000'))throw Error('binary content');
    let path=name,step=1;while(Object.hasOwn(project.files,path)&&step<100){const parts=name.match(/^(.*?)(\.[^.]+)$/);path=parts?`imports/${parts[1]}-${step++}${parts[2]}`:`imports/${step++}-${name}`;}
    if(!core.validPath(path))throw Error('unsafe filename');project=core.edit(project,path,text);active=path;ok++;
   }catch(err){errors.push(name+' ('+String(err.message).slice(0,45)+')');}
  }
  if(ok){save();refresh();notify(`Imported ${ok} editable code file(s); none auto-executed.`);}
  if(errors.length)notify(`${errors.length} file(s) skipped: ${errors[0]}`);
 }
 document.addEventListener('input',e=>{if(e.target?.id==='afideCode'){clearTimeout(editSaveTimer);editSaveTimer=setTimeout(()=>{if(document.getElementById('afideCode')===e.target)sync();},550);}});
 async function browseSaved(){
   const panel=document.getElementById('afideSavedPanel');if(!panel)return;
   if(!backend()) {notify('Saved Projects requires a connected ÆTHERFORGE localhost or private Codespaces port 4546 session.');return;}
   if(!panel.hidden){panel.hidden=true;return;}
   panel.hidden=false;panel.textContent='Loading saved engineering projects...';
   try{const r=await fetch('/api/workspace/projects');if(!r.ok)throw Error('Cannot access local project store');const {projects=[]}=await r.json();
     panel.innerHTML='<strong>SAVED PROJECTS · CONNECTED WORKSPACE</strong>'+(projects.length?projects.map(p=>`<button class="afide-saved-item" data-afide-load="${esc(p.id)}"><span>${esc(p.name)}</span><small>${esc(p.fileCount)} files · revision ${esc(p.revision)} · ${esc(p.updatedAt||'')}</small></button>`).join(''):'<p>No server-saved projects yet. Save your changes in the editor to create one.</p>');
   }catch(e){panel.textContent='Local project storage unavailable.';}
 }
 async function executeActive(){
   if(!sync())return;
   const out=document.getElementById('afideExecOutput');if(!out)return;
   const lang=document.getElementById('afideRunLanguage')?.value;
   if(!backend()){out.textContent='Execution needs the connected ÆTHERFORGE service. Use localhost or the private Codespaces port 4546 URL.';return;}
   if(!((lang==='node'&&/\.(js|mjs|cjs)$/i.test(active))||(lang==='python'&&/\.py$/i.test(active)))){
     out.textContent='Select a matching .js/.mjs or .py source file in the project explorer.';return;}
   const supported=lang==='node'?/\.(js|mjs|cjs|json|txt)$/i:/\.(py|json|txt)$/i;
   const files=Object.fromEntries(Object.entries(project.files).filter(([path])=>supported.test(path)));
   const bytes=new TextEncoder().encode(JSON.stringify({language:lang,files,entry:active})).byteLength;
   if(Object.keys(files).length>32||bytes>65000){out.textContent='This project exceeds the 32-file / 64 KiB execution snapshot limit. Export it or create a smaller runnable example.';return;}
   if(!confirm(`Execute ${active} plus ${Object.keys(files).length-1} support file(s) inside an isolated ${lang==='node'?'Node':'Python'} container? No network or host folders will be mounted.`))return;
   out.textContent='Checking isolated execution availability...';
   try{
     const status=await fetch('/api/execution/capabilities').then(r=>r.json());
     if(!status.available){out.textContent='Sandbox unavailable: '+status.reason+'. Docker is optional; browser preview remains available.';return;}
     out.textContent='Executing a validated project snapshot in a restricted container...';
     const res=await fetch('/api/execution/project',{method:'POST',headers:{'content-type':'application/json','x-aetherforge-local':'1'},body:JSON.stringify({confirmRun:true,language:lang,files,entry:active})});
     const data=await res.json();if(!res.ok){out.textContent='Execution denied: '+data.error;return;}
     out.textContent=`${String(data.status).toUpperCase()} · Exit ${data.exitCode} · ${data.fileCount} source files · ${data.isolation}\n${data.stdout||''}\n${data.stderr||''}`;
   }catch{out.textContent='Sandbox execution unavailable. Check the private Codespaces port 4546 service and Docker diagnostics.';}
 }
 document.addEventListener('click',async e=>{
   const selected=e.target.closest('[data-afide-load]');if(!selected)return;
   if(!confirm('Replace the open editor project with the selected saved project? Export unsaved work first.'))return;
   try{const id=selected.dataset.afideLoad;const res=await fetch('/api/workspace/projects/'+encodeURIComponent(id));
     if(!res.ok)throw Error('Project unavailable');const data=await res.json();project=core.validate(data.project);
     projectId=id;active=project.entry;save();refresh();notify('Loaded saved local engineering project.');
   }catch(e){notify('Could not load stored project.');}
 });
 if(backend())window.addEventListener('load',async()=>{
   try{const r=await fetch('/api/workspace/projects/'+encodeURIComponent(projectId));if(!r.ok)return;
      const data=await r.json();const remote=core.validate(data.project);
      if(remote.revision>project.revision){project=remote;active=project.entry;save();refresh();}
   }catch{}
 });
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&e.target?.id==='afideCode'){e.preventDefault();sync();notify('Project saved locally.');}});
 window.addEventListener('message',e=>{const frame=document.getElementById('afidePreview');if(!frame||e.source!==frame.contentWindow)return;const data=e.data;if(data?.type==='aetherforge-sandbox-ready'){if(runToken)run();return;}if(data?.type!=='aetherforge-sandbox'||data.token!==runToken)return;consoleLines.push((data.level==='error'?'ERROR ':'')+String(data.message||'').slice(0,1800));consoleLines=consoleLines.slice(-35);const out=document.getElementById('afideConsole');if(out)out.textContent=consoleLines.join('\n');});
 document.addEventListener('aetherforge:ide-import',e=>importCode(e.detail));
 window.AetherForgeIDE={render,project:()=>JSON.parse(JSON.stringify(project)),importCode};
})();
