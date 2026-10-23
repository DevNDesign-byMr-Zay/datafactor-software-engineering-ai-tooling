/* ÆTHERFORGE operator preferences: browser-local profile, not an authenticated identity. */
(function(root){'use strict';
 const KEY='aetherforge-operator-profile-v1';
 const defaults=Object.freeze({schemaVersion:1,displayName:'ÆtherForge Operator',organization:'Engineering Studio',role:'Engineer',bio:'',avatar:'',theme:'dark',accent:'cyan',density:'comfortable',motion:'system',editorFontSize:13});
 const text=(value,max)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
 const pick=(value,values,fallback)=>values.includes(value)?value:fallback;
 function normalize(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  const avatar=typeof raw.avatar==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]{1,180000}$/.test(raw.avatar)?raw.avatar:'';
  const fs=Number(raw.editorFontSize);
  return{schemaVersion:1,displayName:text(raw.displayName||defaults.displayName,70),organization:text(raw.organization||defaults.organization,90),role:pick(raw.role,['Engineer','Designer','Developer','Reviewer','Administrator','Operator'],defaults.role),bio:text(raw.bio,350),avatar,theme:pick(raw.theme,['dark','light','system'],defaults.theme),accent:pick(raw.accent,['cyan','violet'],defaults.accent),density:pick(raw.density,['comfortable','compact'],defaults.density),motion:pick(raw.motion,['system','reduce','full'],defaults.motion),editorFontSize:Number.isInteger(fs)&&fs>=11&&fs<=20?fs:defaults.editorFontSize};
 }
 function initials(name){return (text(name,70).split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('')||'AF').slice(0,2);}
 const api=Object.freeze({KEY,defaults,normalize,initials});root.AetherForgeOperatorCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
