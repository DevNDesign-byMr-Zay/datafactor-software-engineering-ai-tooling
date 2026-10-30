/* Pure reference-library search and byte decoding. Sample contents are data. */
(function (root) {
  'use strict';
  function bytes(file) {
    return Uint8Array.from(atob(file.contentBase64), character => character.charCodeAt(0));
  }
  function text(file) {
    return new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes(file));
  }
  function query(files, {q = '', category = 'All', page = 1} = {}) {
    const term = String(q).trim().toLowerCase();
    const matched = files.filter(file => (category === 'All' || file.category === category) &&
      (!term || [file.name, file.path, file.id].join(' ').toLowerCase().includes(term)));
    const pages = Math.max(1, Math.ceil(matched.length / 60));
    const current = Math.min(pages, Math.max(1, Number.isSafeInteger(page) ? page : 1));
    return {rows: matched.slice((current - 1) * 60, current * 60), total: matched.length, pages, page: current};
  }
  root.AetherForgeCorpusCore = Object.freeze({bytes, text, query});
})(typeof window === 'undefined' ? globalThis : window);
