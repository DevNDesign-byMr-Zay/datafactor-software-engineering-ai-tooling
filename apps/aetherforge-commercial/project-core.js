/* ÆtherForge Project Core v1. No IO, no dependency on a provider or user identity. */
(function(root){
 'use strict';
 const VERSION=1, MAX_PROJECTS=24, MAX_EVENTS=30;
 const TEMPLATES=Object.freeze({
  release:{name:'Release readiness review',detail:'Prepare cloud arguments and verify a supplied release acceptance receipt without deploying.',icon:'↗',steps:[
   ['scope','Scope deployment boundary','modules','Identify required modules and confirm access restrictions.'],
   ['preflight','Build Cloud Run preflight','studio','Generate an advisory configuration using maintained deployment planning.','cloud'],
   ['verify','Verify acceptance evidence','evidence','Load a real receipt and run the maintained fail-closed verifier.'],
   ['handoff','Export engineering handoff','projects','Download the project checklist and run history metadata.']]},
  spatial:{name:'Spatial experience preflight',detail:'Inspect assets, build a holographic plan, and document evidence before implementation.',icon:'◎',steps:[
   ['assets','Review spatial design assets','assets','Review existing asset references or import local artwork.'],
   ['contract','Inspect spatial planning module','modules','Read the maintained holographic planner boundary.'],
   ['plan','Generate spatial scene plan','studio','Use the maintained advisory-only holographic scene planner.','holo'],
   ['review','Record plan review','projects','Confirm the intended outputs and constraints.']]},
  interface:{name:'Interface geometry QA',detail:'Validate mask/erase controls and hand over testable interface specifications.',icon:'◇',steps:[
   ['module','Inspect geometry contract','modules','Review bounds, stroke calculations and shape normalization.'],
   ['geometry','Compute brush geometry','studio','Run a bounded maintained calculation and inspect its parameters.','brush'],
   ['compare','Document test scenarios','projects','Capture design edge cases and mark the review state.'],
   ['export','Export the specification','projects','Export reproducible project metadata.']]},
  efficiency:{name:'Workload efficiency assessment',detail:'Compare bounded user-supplied energy and runtime estimates without inventing live measurements.',icon:'◌',steps:[
   ['inputs','Gather input estimates','sustainability','Record duration, estimated energy and renewable energy ratio.'],
   ['analyze','Calculate efficiency','sustainability','Run the maintained sustainability calculation.','energy'],
   ['review','Review the assumptions','projects','Distinguish estimates from externally measured energy.'],
   ['export','Export comparison notes','projects','Package the runbook as a local JSON file.']]},
  custom:{name:'Blank engineering project',detail:'A customizable task board with no implied provider access.',icon:'＋',steps:[
   ['scope','Define purpose','projects','Document the outcome and constraints.'],
   ['build','Execute supported work','studio','Choose a maintained operation or write implementation notes.'],
   ['validate','Validate the result','evidence','Only call a result verified when evidence supports it.'],
   ['deliver','Package deliverables','projects','Export local project metadata.']]}
 });
 const statuses=['todo','doing','done'];
 function clean(s,max=160){return String(s??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max)}
 function uid(){return typeof root.crypto?.randomUUID==='function'?root.crypto.randomUUID():('af-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9))}
 function makeProject(templateId='custom',title){const t=TEMPLATES[templateId]||TEMPLATES.custom; const now=new Date().toISOString();return {schemaVersion:VERSION,id:uid(),template:templateId in TEMPLATES?templateId:'custom',title:clean(title,72)||t.name,notes:'',createdAt:now,updatedAt:now,steps:t.steps.map(row=>({id:row[0],title:row[1],page:row[2],detail:row[3],action:row[4]||null,status:'todo'})),events:[]};}
 function sanitizeProject(v){if(!v||typeof v!=='object'||Array.isArray(v)||v.schemaVersion!==VERSION)throw new TypeError('Project schema not supported'); const t=v.template in TEMPLATES?v.template:'custom';if(!Array.isArray(v.steps)||v.steps.length<1||v.steps.length>16)throw new TypeError('Project step limit exceeded');if(!Array.isArray(v.events)||v.events.length>MAX_EVENTS)throw new TypeError('Project event limit exceeded');const allowedPages=new Set(['overview','modules','studio','evidence','sustainability','assets','assistant','projects']);const allowedActions=new Set(['cloud','holo','brush','energy']);const steps=v.steps.map((s,i)=>({id:clean(s.id,30)||'step'+i,title:clean(s.title,90)||'Step '+(i+1),page:allowedPages.has(s.page)?s.page:'projects',detail:clean(s.detail,300),action:allowedActions.has(s.action)?s.action:null,status:statuses.includes(s.status)?s.status:'todo'}));const events=v.events.map(e=>({id:clean(e.id,64)||uid(),action:clean(e.action,24),source:clean(e.source,64),status:['computed','planned','checked','offline','complete'].includes(e.status)?e.status:'complete',at:isTime(e.at)?e.at:new Date().toISOString()}));return {schemaVersion:VERSION,id:clean(v.id,90)||uid(),template:t,title:clean(v.title,72)||'Untitled engineering project',notes:clean(v.notes,1200),createdAt:isTime(v.createdAt)?v.createdAt:new Date().toISOString(),updatedAt:isTime(v.updatedAt)?v.updatedAt:new Date().toISOString(),steps,events};}
 function isTime(value){return typeof value==='string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value))}
 function sanitizeWorkspace(value){if(!Array.isArray(value))throw new TypeError('Expected project array');if(value.length>MAX_PROJECTS)throw new TypeError('Project quota exceeded');const cleaned=value.map(sanitizeProject);if(new Set(cleaned.map(p=>p.id)).size!==cleaned.length)throw new TypeError('Duplicate project IDs');return cleaned;}
 function progress(project){const total=project.steps.length,done=project.steps.filter(s=>s.status==='done').length;return {done,total,percent:Math.round(done/Math.max(1,total)*100)};}
 function updateStatus(project,stepId){const p=sanitizeProject(project),step=p.steps.find(s=>s.id===stepId);if(!step)throw new TypeError('Unknown task');step.status=statuses[(statuses.indexOf(step.status)+1)%3];p.updatedAt=new Date().toISOString();return p;}
 function recordRun(project,run){const p=sanitizeProject(project),action=clean(run?.action,24);if(!['cloud','holo','brush','energy','receipt'].includes(action))throw new TypeError('Unknown workflow');p.events.unshift({id:uid(),action,source:clean(run.source,64)||'unknown',status:['planned','checked','computed','offline'].includes(run.status)?run.status:'complete',at:new Date().toISOString()});p.events=p.events.slice(0,MAX_EVENTS);p.updatedAt=new Date().toISOString();return p;}
 const api=Object.freeze({VERSION,TEMPLATES,MAX_PROJECTS,makeProject,sanitizeProject,sanitizeWorkspace,progress,updateStatus,recordRun});
 root.AetherForgeProjectCore=api;
 if(typeof module!=='undefined' && module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
