/* ÆTHERFORGE project ZIP export. No dependencies, external network or executable code. */
(function(root){'use strict';
 const encoder=new TextEncoder();
 const DOS_TIME=0, DOS_DATE=((2020-1980)<<9)|1;
 const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;});
 const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
 const pack=(entries)=>{
  if(!Array.isArray(entries)||entries.length<1||entries.length>90)throw Error('Invalid ZIP file count');
  const chunks=[],directory=[],seen=new Set();let offset=0;
  for(const {path,content} of entries){
   if(typeof path!=='string'||path.length>180||!(/^[A-Za-z0-9_./-]+$/.test(path))||path.startsWith('/')||path.endsWith('/')||path.split('/').some(p=>!p||p==='..'||p==='.')||seen.has(path))throw Error('Unsafe or duplicate ZIP path');
   if(typeof content!=='string')throw Error('ZIP accepts editable text files only');seen.add(path);
   const name=encoder.encode(path),body=encoder.encode(content),crc=crc32(body);
   if(name.length>250||body.length>180000||offset+body.length>1900000)throw Error('Project exceeds ZIP bounds');
   const local=new Uint8Array(30+name.length),h=new DataView(local.buffer);
   h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);
   h.setUint16(8,0,true);h.setUint16(10,DOS_TIME,true);h.setUint16(12,DOS_DATE,true);
   h.setUint32(14,crc,true);h.setUint32(18,body.length,true);h.setUint32(22,body.length,true);h.setUint16(26,name.length,true);local.set(name,30);
   chunks.push(local,body);directory.push({name,crc,size:body.length,offset});offset+=local.length+body.length;
  }
  const start=offset;
  for(const f of directory){const part=new Uint8Array(46+f.name.length),v=new DataView(part.buffer);
   v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);
   v.setUint16(10,0,true);v.setUint16(12,DOS_TIME,true);v.setUint16(14,DOS_DATE,true);v.setUint32(16,f.crc,true);
   v.setUint32(20,f.size,true);v.setUint32(24,f.size,true);v.setUint16(28,f.name.length,true);v.setUint32(42,f.offset,true);part.set(f.name,46);
   chunks.push(part);offset+=part.length;
  }
  const end=new Uint8Array(22),dv=new DataView(end.buffer);dv.setUint32(0,0x06054b50,true);
  dv.setUint16(8,directory.length,true);dv.setUint16(10,directory.length,true);dv.setUint32(12,offset-start,true);dv.setUint32(16,start,true);
  chunks.push(end);const result=new Uint8Array(offset+end.length);let pos=0;for(const part of chunks){result.set(part,pos);pos+=part.length;}return result;
 };
 function exportProject(project,validate){const p=validate(project);const rows=Object.keys(p.files).sort().map(path=>({path,content:p.files[path]}));
  if(p.files['AETHERFORGE-PROJECT.json']||p.files['README-AETHERFORGE.txt'])throw Error('Reserved project export filenames');
  rows.push({path:'AETHERFORGE-PROJECT.json',content:JSON.stringify({schemaVersion:1,product:'aetherforge',name:p.name,entry:p.entry,revision:p.revision,fileCount:rows.length,execution:'not run on export'},null,2)+'\n'});
  rows.push({path:'README-AETHERFORGE.txt',content:'ÆTHERFORGE · EDITABLE ENGINEERING PROJECT\n\nAll original source paths are preserved. No code is run during export.\nOpen HTML in your browser for compatible static projects. Use the ÆtherForge workbench for sandboxed execution.\nReview dependencies and licenses before distribution.\n'});
  return pack(rows);
 }
 function importProject(input,validate,name='Imported engineering project'){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(bytes.length>2000000||bytes.length<22)throw Error('ZIP size not supported');
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder('utf-8',{fatal:true});
  let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50&&i+22+dv.getUint16(i+20,true)===bytes.length){eocd=i;break;}}
  if(eocd<0||dv.getUint16(eocd+4,true)||dv.getUint16(eocd+6,true))throw Error('Invalid single-disk ZIP');
  const count=dv.getUint16(eocd+10,true),dirSize=dv.getUint32(eocd+12,true),dirOffset=dv.getUint32(eocd+16,true);
  if(!count||count>90||dirOffset+dirSize>eocd)throw Error('Unsupported ZIP directory');
  const files={};let manifest=null,total=0,ptr=dirOffset;
  for(let i=0;i<count;i++){
   if(ptr+46>eocd||dv.getUint32(ptr,true)!==0x02014b50)throw Error('Damaged ZIP central directory');
   const flags=dv.getUint16(ptr+8,true),method=dv.getUint16(ptr+10,true),crc=dv.getUint32(ptr+16,true),compressed=dv.getUint32(ptr+20,true),size=dv.getUint32(ptr+24,true),nlen=dv.getUint16(ptr+28,true),extra=dv.getUint16(ptr+30,true),comment=dv.getUint16(ptr+32,true),extAttrs=dv.getUint32(ptr+38,true),localOffset=dv.getUint32(ptr+42,true);
   if(flags&1||method!==0||compressed!==size||size>180000||nlen<1||ptr+46+nlen+extra+comment>eocd)throw Error('Only bounded, uncompressed source ZIPs are supported');
   const path=decoder.decode(bytes.subarray(ptr+46,ptr+46+nlen));ptr+=46+nlen+extra+comment;
   if(!/^[A-Za-z0-9_./-]{1,180}$/.test(path)||path.startsWith('/')||path.endsWith('/')||path.split('/').some(x=>!x||x==='..'||x==='.'))throw Error('Unsafe archive path');
   // Unix symlinks must not be imported as regular text files.
   if(((extAttrs>>>16)&0xf000)===0xa000)throw Error('Symlink entries are not allowed');
   if(localOffset+30>dirOffset||dv.getUint32(localOffset,true)!==0x04034b50)throw Error('Missing ZIP file header');
   const localNameLen=dv.getUint16(localOffset+26,true),localExtraLen=dv.getUint16(localOffset+28,true);
   const dataStart=localOffset+30+localNameLen+localExtraLen;
   if(dataStart+size>dirOffset||decoder.decode(bytes.subarray(localOffset+30,localOffset+30+localNameLen))!==path)throw Error('ZIP file offset mismatch');
   const body=bytes.subarray(dataStart,dataStart+size);if(crc32(body)!==crc)throw Error('ZIP CRC verification failed');
   total+=size;if(total>1600000)throw Error('ZIP contents exceed local project limits');
   const text=decoder.decode(body);
   if(path==='AETHERFORGE-PROJECT.json'){manifest=JSON.parse(text);continue;}
   if(path==='README-AETHERFORGE.txt')continue;
   if(Object.hasOwn(files,path))throw Error('Duplicate ZIP file');
   files[path]=text;
  }
  if(ptr!==dirOffset+dirSize||!Object.keys(files).length)throw Error('Invalid ZIP file set');
  const entries=Object.keys(files),entry=manifest?.entry&&Object.hasOwn(files,manifest.entry)?manifest.entry:(entries.find(x=>/(^|\/)index\.html?$/i.test(x))||entries.find(x=>/\.html?$/i.test(x))||entries[0]);
  return validate({schemaVersion:1,name:typeof manifest?.name==='string'?manifest.name:name,revision:1,entry,files});
 }
 const api=Object.freeze({crc32,pack,exportProject,importProject});root.AetherForgeProjectZip=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
