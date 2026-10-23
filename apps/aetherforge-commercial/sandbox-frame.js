/* Opaque-origin preview: project code never runs in the parent workbench or server. */
(()=>{'use strict';let token='';
 const emit=(level,args)=>{if(!token)return;try{parent.postMessage({type:'aetherforge-sandbox',token,level,message:[...args].map(x=>{try{return typeof x==='string'?x:JSON.stringify(x)}catch{return String(x)}}).join(' ').slice(0,3000)},'*');}catch{}};
 for(const level of ['log','info','warn','error']){const original=console[level];console[level]=function(...args){emit(level,args);original.apply(console,args);};}
 window.addEventListener('error',e=>emit('error',[e.message]));window.addEventListener('unhandledrejection',e=>emit('error',[String(e.reason)]));
 function relativeRef(entry,ref){
  if(typeof ref!=='string'||ref.length>180||/^(?:[a-z][a-z0-9+.-]*:|\/|\\|#|\?)/i.test(ref)||/[?#\u0000-\u001f]/.test(ref))return null;
  const dirs=entry.split('/').slice(0,-1);for(const segment of ref.split('/')){if(!segment||segment==='.')continue;
   if(segment==='..'){if(!dirs.length)return null;dirs.pop();}else if(!/^[A-Za-z0-9_.-]+$/.test(segment))return null;else dirs.push(segment);}
  return dirs.join('/');
 }
 window.addEventListener('message',e=>{if(e.source!==parent)return;const d=e.data;if(!d||d.type!=='aetherforge-sandbox-run'||!/^[-_a-zA-Z0-9]{1,48}$/.test(d.token||''))return;
  const files=d.files;if(!files||['html','css','js'].some(k=>typeof files[k]!=='string'||files[k].length>180000))return;
  const provided=files.projectFiles&&typeof files.projectFiles==='object'&&!Array.isArray(files.projectFiles)?files.projectFiles:{};
  if(Object.keys(provided).length>30||Object.entries(provided).some(([k,v])=>typeof v!=='string'||v.length>180000||!/^[-_a-zA-Z0-9/.]+$/.test(k))||Object.values(provided).reduce((n,v)=>n+v.length,0)>200000)return;
  const entry=typeof files.entry==='string'&&/^[a-zA-Z0-9_./-]+\.html?$/i.test(files.entry)?files.entry:'index.html';
  token=d.token;const root=document.getElementById('sandbox-root');if(!root)return;
  try{
   document.querySelector('#sandbox-user-style')?.remove();document.querySelector('#sandbox-user-script')?.remove();root.replaceChildren();
   const parsed=new DOMParser().parseFromString(files.html,'text/html');
   // No network refs are fetched. A declared local file is loaded only if present in the project snapshot.
   const styles=[];let linkedStyles=0;
   for(const element of [...parsed.querySelectorAll('link')]){
    if((element.getAttribute('rel')||'').toLowerCase().split(/\s+/).includes('stylesheet')){
     linkedStyles++;const source=relativeRef(entry,element.getAttribute('href'));if(source&&source.endsWith('.css')&&Object.hasOwn(provided,source))styles.push(provided[source]);
     else emit('warn',['Blocked or missing local stylesheet:',element.getAttribute('href')||'(empty)']);
    }element.remove();
   }
   for(const element of [...parsed.querySelectorAll('style')]){styles.push(element.textContent);element.remove();}
   if(!linkedStyles)styles.push(files.css);
   const scripts=[];let linkedScripts=0;
   for(const element of [...parsed.querySelectorAll('script')]){
    const type=(element.getAttribute('type')||'').toLowerCase().trim();const supported=!type||type==='text/javascript'||type==='application/javascript';
    if(element.hasAttribute('src')){
     linkedScripts++;const src=element.getAttribute('src'),source=relativeRef(entry,src);
     if(supported&&source&&source.endsWith('.js')&&Object.hasOwn(provided,source))scripts.push(provided[source]);
     else emit('warn',['Blocked, missing, or unsupported local script:',src||'(empty)']);
    }else if(supported)scripts.push(element.textContent.slice(0,180000));
    else if(type==='module')emit('warn',['ES module scripts need a compiled browser bundle; not executed.']);
    element.remove();
   }
   if(!linkedScripts)scripts.push(files.js);
   for(const el of [...parsed.querySelectorAll('base,meta[http-equiv="refresh"],iframe,object,embed')])el.remove();
   const style=document.createElement('style');style.id='sandbox-user-style';style.textContent=styles.join('\n').slice(0,200000);document.head.append(style);
   root.innerHTML=parsed.body.innerHTML;
   const script=document.createElement('script');script.id='sandbox-user-script';script.textContent=scripts.join('\n;\n').slice(0,200000);document.body.append(script);
   emit('info',['Project preview ready · local dependencies resolved in document order']);
  }catch(err){emit('error',[err.message||'Preview failed']);}
 });
 parent.postMessage({type:'aetherforge-sandbox-ready'},'*');
})();
