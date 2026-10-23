/* ÆTHERFORGE upstream catalog — public-source metadata only; no execution or credentials. */
(function(root){'use strict';
 const REPOS=Object.freeze([
  {id:'roary-corpus',owner:'DevNDesign-byMr-Zay',repo:'roary-datafactor-assessment',name:'ROARY · Engineering Corpus',family:'ROARY',expected:153},
  {id:'roary-runtime',owner:'DevNDesign-byMr-Zay',repo:'roary.ai',name:'ROARY.ai · Runtime',family:'ROARY',expected:5},
  {id:'canva-apps',owner:'DevNDesign-byMr-Zay',repo:'Canva-App',name:'Canva Apps · DepthPop / HoloForge',family:'Canva',expected:514}
 ]);
 function safePath(path){return typeof path==='string'&&path.length<=500&&!path.startsWith('/')&&!path.split('/').some(p=>p==='..')&&!/[\u0000-\u001f\\]/.test(path);}
 function assetType(path){if(/\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(path))return 'image';if(/\.(glb|gltf|usdz|fbx|obj|mp4|mov|webm|zip|pdf|woff2?|ttf|otf)$/i.test(path))return 'artifact';if(/\.(md|txt|rst)$/i.test(path))return 'document';if(/\.(js|mjs|cjs|jsx|tsx?|py|go|rs|java|swift|html|css|json|yml|yaml|sh|ps1|cmd|sql|toml)$/i.test(path))return 'code';return 'other';}
 function collection(repo,path){if(repo.family==='ROARY')return repo.id==='roary-runtime'?'ROARY / Runtime':'ROARY / Engineering Corpus';if(path.startsWith('apps/depthpop-canva/'))return 'Canva / DepthPop';if(path.startsWith('apps/holoforge-canva/'))return 'Canva / HoloForge';if(path.startsWith('canva-app/'))return 'Canva / Legacy App';if(path.startsWith('legacy-html/')||path.startsWith('archive_verifier/'))return 'Canva / Legacy & Archive';if(path.startsWith('provenance/')||path.startsWith('tests/')||path.includes('/tests/'))return 'Canva / Evidence & Tests';return 'Canva / Shared Platform';}
 function normalizeTree(repo,tree,ref='main'){
  if(!REPOS.some(x=>x.id===repo?.id)||!Array.isArray(tree))throw Error('Invalid source tree');
  if(!/^[a-zA-Z0-9._-]{1,90}$/.test(ref))throw Error('Invalid branch');
  const rows=[],seen=new Set();
  for(const f of tree){if(f?.type!=='blob'||!safePath(f.path)||!Number.isSafeInteger(f.size)||f.size<0||!(/^[a-f0-9]{40}$/.test(f.sha||''))||seen.has(f.path))continue;
   seen.add(f.path);const segments=f.path.split('/'),name=segments.at(-1);rows.push({id:repo.id+':'+f.path,name,path:f.path,repo:repo.repo,collection:collection(repo,f.path),family:repo.family,type:assetType(name),bytes:f.size,sha:f.sha,ref,origin:'upstream',licenseStatus:'review-required',url:`https://github.com/${repo.owner}/${repo.repo}/blob/${encodeURIComponent(ref)}/${f.path.split('/').map(encodeURIComponent).join('/')}`,rawUrl:`https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${encodeURIComponent(ref)}/${f.path.split('/').map(encodeURIComponent).join('/')}`});
  }
  return rows;
 }
 function validateSnapshot(snapshot){if(!snapshot||snapshot.schemaVersion!==1||!Array.isArray(snapshot.collections))throw Error('Unsupported registry format');const result=[];for(const c of snapshot.collections){const repo=REPOS.find(r=>r.id===c.repoId);if(!repo||!Array.isArray(c.tree)||c.tree.length>2000||!c.ref)continue;result.push(...normalizeTree(repo,c.tree,c.ref));}return result;}
 const api=Object.freeze({REPOS,safePath,assetType,collection,normalizeTree,validateSnapshot});root.AetherForgeUpstreamCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
