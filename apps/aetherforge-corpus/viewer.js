/* The viewer intentionally has no execution, upload, authentication or network API. */
(() => {
  'use strict';
  const catalog = window.AETHERFORGE_CORPUS;
  const core = window.AetherForgeCorpusCore;
  const el = id => document.getElementById(id);
  if (!catalog || !core) {el('count').textContent = 'Collection unavailable. Extract the complete ZIP and reopen this page.'; return;}
  const categories = [...new Set(catalog.files.map(file => file.category))].sort();
  for (const category of categories) {
    const option = document.createElement('option'); option.textContent = category; el('category').append(option);
  }
  if (location.protocol !== 'file:') el('workspace').href = '/';
  el('verified').textContent = `${catalog.files.length.toLocaleString()} originals · verified ${catalog.verifiedAt}`;
  let page = 1, selected = null;
  function select(file) {
    selected = file;
    el('filename').textContent = file ? file.name : 'No matching files';
    el('path').textContent = file?.path || '';
    el('drive-id').textContent = file?.id || '';
    el('bytes').textContent = file ? file.bytes.toLocaleString() : '';
    el('sha').textContent = file?.sha256 || '';
    el('source').textContent = file ? core.text(file) : '';
    el('download').disabled = !file;
    for (const row of el('files').children) row.setAttribute('aria-pressed', String(row.dataset.fileId === file?.id));
  }
  function render() {
    const result = core.query(catalog.files, {q: el('search').value, category: el('category').value, page});
    page = result.page; el('files').replaceChildren();
    for (const file of result.rows) {
      const row = document.createElement('button'); row.type = 'button'; row.className = 'file'; row.dataset.fileId = file.id;
      const name = document.createElement('strong'); name.textContent = file.name;
      const path = document.createElement('small'); path.textContent = file.path.split('/').slice(1).join('/');
      row.append(name, path); row.addEventListener('click', () => select(file)); el('files').append(row);
    }
    el('count').textContent = `${result.total.toLocaleString()} of ${catalog.files.length.toLocaleString()} files`;
    el('page').textContent = `Page ${page} of ${result.pages}`;
    el('previous').disabled = page <= 1; el('next').disabled = page >= result.pages;
    select(result.rows.find(file => file.id === selected?.id) || result.rows[0] || null);
  }
  el('search').addEventListener('input', () => {page = 1; render();});
  el('category').addEventListener('change', () => {page = 1; render();});
  el('previous').addEventListener('click', () => {page--; render();});
  el('next').addEventListener('click', () => {page++; render();});
  el('download').addEventListener('click', () => {
    if (!selected) return;
    const url = URL.createObjectURL(new Blob([core.bytes(selected)], {type: 'application/octet-stream'}));
    const link = document.createElement('a'); link.href = url; link.download = selected.path.split('/').pop(); link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  render();
})();
