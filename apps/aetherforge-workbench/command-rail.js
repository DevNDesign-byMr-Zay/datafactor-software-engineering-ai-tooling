/* ÆtherForge command rail — navigation only; never executes repository actions. */
(() => {
  const pages = [
    ['overview','Overview','Engineering cockpit'],
    ['modules','Module Library','Search maintained capabilities'],
    ['studio','Workflow Studio','Configure bounded workflows'],
    ['evidence','Evidence Center','Verify runtime receipts'],
    ['sustainability','Sustainability Lab','Calculate explicit-input efficiency'],
    ['assets','Asset Studio','Review the visual system'],
    ['assistant','Engineering Guide','Deterministic module guidance'],
    ['settings','Settings & About','Appearance and runtime boundary']
  ];
  let modules = [];
  let rail;
  const input = () => document.querySelector('#globalSearch');
  const searchWrap = () => document.querySelector('.command-search-wrap');
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const ensureRail = () => {
    if (rail) return rail;
    rail = document.createElement('div');
    rail.className = 'command-rail';
    rail.setAttribute('role','listbox');
    rail.setAttribute('aria-label','ÆtherForge command suggestions');
    searchWrap()?.appendChild(rail);
    return rail;
  };
  const openModule = id => {
    document.querySelector('[data-page="modules"]')?.click();
    requestAnimationFrame(() => document.querySelector('[data-module="' + CSS.escape(id) + '"]')?.click());
  };
  const openPage = page => document.querySelector('[data-page="' + CSS.escape(page) + '"]')?.click();
  const hide = () => { if (rail) rail.classList.remove('show'); };
  const render = query => {
    const q = query.trim().toLowerCase();
    if (!q) { hide(); return; }
    const pageMatches = pages.filter(p => (p[1] + ' ' + p[2]).toLowerCase().includes(q)).slice(0,3);
    const moduleMatches = modules.filter(m => (m.name + ' ' + m.category + ' ' + m.description + ' ' + m.path).toLowerCase().includes(q)).slice(0,5);
    const results = [
      ...pageMatches.map(p => `<button class="command-result" data-command-result="page" data-command-page="${esc(p[0])}"><span class="command-result-icon">◫</span><span><strong>${esc(p[1])}</strong><small>${esc(p[2])}</small></span><em>WORKSPACE</em></button>`),
      ...moduleMatches.map(m => `<button class="command-result" data-command-result="module" data-command-module="${esc(m.id)}"><span class="command-result-icon">⬡</span><span><strong>${esc(m.name)}</strong><small>${esc(m.category)} · ${esc(m.description)}</small></span><em>MODULE</em></button>`)
    ];
    const target = ensureRail();
    target.innerHTML = results.length ? '<div class="command-rail-head"><span>COMMAND RAIL</span><small>' + results.length + ' matches</small></div>' + results.join('') : '<div class="command-empty">No local workbench match. Press Enter to search the full Module Library.</div>';
    target.classList.add('show');
  };
  const loadModules = async () => {
    try { const response = await fetch('/api/modules'); if (response.ok) { const payload = await response.json(); if (Array.isArray(payload.modules)) modules = payload.modules; } } catch {}
  };
  document.addEventListener('keyup', event => {
    if (event.target !== input()) return;
    if (event.key === 'Escape') { hide(); return; }
    render(event.target.value);
  });
  document.addEventListener('focusin', event => {
    if (event.target !== input()) return;
    loadModules().finally(() => render(event.target.value));
  });
  document.addEventListener('click', event => {
    const result = event.target.closest('[data-command-result]');
    if (result) {
      if (result.dataset.commandResult === 'module') openModule(result.dataset.commandModule);
      else openPage(result.dataset.commandPage);
      hide();
      return;
    }
    if (!event.target.closest('.command-search') && !event.target.closest('.command-rail')) hide();
  });
})();
