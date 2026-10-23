#!/usr/bin/env python3
"""Pinned SHA-256 import; no executing ZIP contents or overwriting canonical repository files."""
from pathlib import Path, PurePosixPath
import hashlib, json, stat, sys, shutil, tempfile, zipfile
NAME='AETHERFORGE-Commercial-Codespaces-v1.5.0.zip'
SHA='ef7e113bf9a71decc0dfd57d133d364fc161f68fee3544dafe971b8357a2ee36'
APP='apps/aetherforge-commercial'
TEST='tests/aetherforge-commercial-cloud.test.mjs'
def fail(why): raise SystemExit('[ÆTHERFORGE] Import refused: '+why)
def good_path(n):
 p=PurePosixPath(n)
 return str(p)==n and not n.startswith('/') and '\\' not in n and '..' not in p.parts and (n.startswith(APP+'/') or n==TEST)
def main():
 root=Path(__file__).resolve().parent.parent
 if not (root/'.git').exists(): fail('repository checkout missing')
 source=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root/NAME
 if not source.is_file() or source.stat().st_size>8*1024*1024: fail('release ZIP missing or too large')
 if hashlib.sha256(source.read_bytes()).hexdigest()!=SHA: fail('unexpected ZIP SHA256')
 if (root/APP).exists() or (root/TEST).exists(): fail('previous import exists; refusing overwrite')
 with zipfile.ZipFile(source) as z:
  if z.testzip() is not None: fail('bad archive CRC')
  try: manifest=json.loads(z.read('CLOUD-IMPORT-MANIFEST.json'))
  except (KeyError,ValueError): fail('invalid release manifest')
  files=manifest.get('files')
  if manifest.get('format')!='aetherforge-codespaces-commercial-v1' or manifest.get('appVersion')!='1.5.0-cloud' or not isinstance(files,dict) or len(files)<40: fail('wrong release schema')
  if not all(good_path(n) for n in files) or TEST not in files or APP+'/server.mjs' not in files: fail('unsafe paths or missing entrypoints')
  all_entries=z.infolist()
  infos={i.filename:i for i in all_entries}
  if len(infos)!=len(all_entries) or not set(files).issubset(infos): fail('duplicate or missing ZIP entries')
  if sum(infos[n].file_size for n in files)>8*1024*1024: fail('oversized source bundle')
  for n,h in files.items():
   i=infos[n]
   if i.is_dir() or i.file_size>2*1024*1024 or (i.external_attr>>16)&0o170000==stat.S_IFLNK or not isinstance(h,str) or len(h)!=64 or hashlib.sha256(z.read(n)).hexdigest()!=h: fail('source integrity mismatch: '+n)
  with tempfile.TemporaryDirectory(prefix='aetherforge-cloud-') as td:
   staging=Path(td)
   for name in files:
    file=staging/name
    file.parent.mkdir(parents=True,exist_ok=True)
    file.write_bytes(z.read(name))
   (root/APP).parent.mkdir(parents=True,exist_ok=True)
   (root/TEST).parent.mkdir(parents=True,exist_ok=True)
   shutil.move(str(staging/APP),str(root/APP))
   shutil.move(str(staging/TEST),str(root/TEST))
 print('[ÆTHERFORGE] Imported verified commercial source; companion and root src untouched.')
 print('Next: node --test tests/aetherforge-commercial-cloud.test.mjs')
 print('Then: bash .devcontainer/start-commercial.sh')
if __name__=='__main__': main()
