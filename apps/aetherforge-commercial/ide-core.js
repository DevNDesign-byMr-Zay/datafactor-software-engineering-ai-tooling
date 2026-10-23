/* ÆTHERFORGE project model — deterministic, dependency-free, serializable and testable. */
(function(root){'use strict';
 const MAX_FILES=75,MAX_SOURCE=180000,MAX_TOTAL=1600000;
 const validPath=path=>typeof path==='string'&&path.length>0&&path.length<=180&&/^[a-zA-Z0-9_./-]+$/.test(path)&&!path.startsWith('/')&&!path.endsWith('/')&&!/(?:^|\/)(?:\.env(?:\.[^/]*)?|credentials(?:\.[^/]*)?|id_rsa|private\.key|secrets)(?:\/|$)/i.test(path)&&!path.split('/').some(p=>p==='.'||p==='..'||!p)&&/\.(html|htm|css|scss|js|mjs|cjs|json|md|ts|tsx|jsx|py|svg|txt|xml|yml|yaml|sql|sh|ps1|cmd|java|go|rs|rb|php|vue|svelte|c|h|cpp|cs)$/i.test(path);
 const runtime=path=>/\.html?$/i.test(path)?'html':/\.css$/i.test(path)?'css':/\.js$/i.test(path)?'js':'reference';
 const starter=()=>({schemaVersion:1,name:'Untitled engineering project',revision:1,entry:'index.html',files:{'index.html':'<main><h1>ÆTHERFORGE</h1><p>Your next component begins here.</p><button id="demo">Run interaction</button></main>','styles.css':'body{margin:0;min-height:100vh;background:#07111f;color:#e7f5ff;font:16px system-ui;display:grid;place-items:center}main{padding:30px;border:1px solid #2e6e93;border-radius:16px}h1{letter-spacing:.12em;color:#65e3ef}button{background:#7956dc;border:0;color:white;padding:12px 18px;border-radius:8px;cursor:pointer}','script.js':'document.querySelector("#demo")?.addEventListener("click",()=>{console.log("ÆtherForge: interaction verified");document.querySelector("p").textContent="Your component is running."})'} });
 function validate(obj){if(!obj||obj.schemaVersion!==1||typeof obj.name!=='string'||!obj.name.trim()||obj.name.length>140||!obj.files||Array.isArray(obj.files)||typeof obj.files!=='object')throw Error('Invalid IDE project');const list=Object.entries(obj.files);if(!list.length||list.length>MAX_FILES)throw Error('Project has no files or too many files');let total=0;for(const [path,value] of list){if(!validPath(path)||typeof value!=='string'||value.length>MAX_SOURCE)throw Error('Invalid file path or size: '+path);total+=value.length;}if(total>MAX_TOTAL)throw Error('Project storage limit exceeded');if(!validPath(obj.entry)||!Object.hasOwn(obj.files,obj.entry))throw Error('Missing entry file');return{schemaVersion:1,name:obj.name.trim(),revision:Number.isInteger(obj.revision)?obj.revision:1,entry:obj.entry,files:Object.fromEntries(list)};}
 function edit(project,path,value){const p=validate(project);if(!validPath(path)||typeof value!=='string'||value.length>MAX_SOURCE)throw Error('Invalid source edit');return validate({...p,revision:p.revision+1,files:{...p.files,[path]:value}});}
 function remove(project,path){const p=validate(project);if(path===p.entry)throw Error('Cannot remove project entry');const files={...p.files};delete files[path];return validate({...p,revision:p.revision+1,files});}
 function rename(project,oldPath,newPath){const p=validate(project);if(!Object.hasOwn(p.files,oldPath)||!validPath(newPath)||Object.hasOwn(p.files,newPath))throw Error('Cannot rename file');const files={...p.files,[newPath]:p.files[oldPath]};delete files[oldPath];return validate({...p,revision:p.revision+1,entry:p.entry===oldPath?newPath:p.entry,files});}
 function previewFiles(project,selected){
  const p=validate(project),refs=[];const target=selected&&runtime(selected)==='html'&&Object.hasOwn(p.files,selected)?selected:p.entry;
  const html=runtime(target)==='html'?p.files[target]:'';
  const base=target.includes('/')?target.slice(0,target.lastIndexOf('/')+1):'';
  const resolveRef=value=>{if(typeof value!=='string'||/^(?:[a-z]+:|\/|\\|#|\?)/i.test(value)||/[?#]/.test(value))return null;
   const stack=[];for(const seg of (base+value).split('/')){if(!seg||seg==='.')continue;if(seg==='..'){if(!stack.length)return null;stack.pop();}else stack.push(seg);}const resolved=stack.join('/');return validPath(resolved)?resolved:null;};
  const paths=new Set();for(const match of html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"'<>]+)["'][^>]*>/gi)){
   const path=resolveRef(match[1]);if(path&&Object.hasOwn(p.files,path)&&/\.(?:css|js)$/i.test(path))paths.add(path);
  }
  let bytes=0;const projectFiles={};for(const name of paths){const content=p.files[name];bytes+=content.length;if(bytes>200000||Object.keys(projectFiles).length>=30)break;projectFiles[name]=content;}
  const css=Object.entries(p.files).filter(([k])=>runtime(k)==='css').map(([k,v])=>`/* ${k} */\n${v}`).join('\n').slice(0,180000);
  const js=Object.entries(p.files).filter(([k])=>runtime(k)==='js').map(([k,v])=>`// ${k}\n${v}`).join('\n;\n').slice(0,180000);
  for(const f of Object.keys(p.files))if(runtime(f)==='reference')refs.push(f);
  return {html,css,js,projectFiles,entry:target,references:refs};
 }

 const api=Object.freeze({MAX_FILES,MAX_SOURCE,validPath,runtime,starter,validate,edit,remove,rename,previewFiles});root.AetherForgeIDECore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
