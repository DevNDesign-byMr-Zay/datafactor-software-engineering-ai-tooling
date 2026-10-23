/* ÆtherForge session workspace layer — local UI state only. */
(() => {
  const PINS_KEY = 'aetherforge-pinned-modules';
  const RECENT_KEY = 'aetherforge-recent-pages';
  const LAST_MODULE_KEY = 'aetherforge-last-module';
  const PAGE_LABELS = { overview:'Overview', modules:'Module Library', studio:'Workflow Studio', evidence:'Evidence Center', sustainability:'Sustainability Lab', assets:'Asset Studio', assistant:'Engineering Guide', settings:'Settings & About' };
  const read = (key, fallback=[]) => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) ? value : fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const pins = () => read(PINS_KEY, []);
  const recents = () => read(RECENT_KEY, []);
  const currentPage = () => document.querySelector('.nav button.active')?.dataset.page || null;
  const showToast = message => { const toast = document.querySelector('#toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); };
  const rememberPage = page => {
    if (!PAGE_LABELS[page] || page === 'overview') return;
    const next = [{page,label:PAGE_LABELS[page]}, ...recents().filter(item => item.page !== page)].slice(0,5);
    write(RECENT_KEY, next);
  };
  const moduleFromRow = row => {
    const id = row?.dataset.module;
    const name = row?.querySelector('strong')?.textContent?.trim();
    return id && name ? {id,name} : null;
  };
  const togglePin = module => {
    if (!module) return;
    const existing = pins();
    const index = existing.findIndex(item => item.id === module.id);
    if (index >= 0) { existing.splice(index, 1); showToast(module.name + ' removed from pinned capabilities.'); }
    else { existing.unshift(module); showToast(module.name + ' pinned to your workspace.'); }
    write(PINS_KEY, existing.slice(0,8));
    enhance();
  };
  const openModule = id => {
    const nav = document.querySelector('[data-page="modules"]');
    if (!nav) return;
    nav.click();
    requestAnimationFrame(() => {
      const row = document.querySelector('[data-module="' + CSS.escape(id) + '"]');
      if (row) row.click();
    });
  };
  const pinButton = () => {
    const detail = document.querySelector('#moduleDetail .detail-box');
    if (!detail) return;
    const last = (() => { try { return JSON.parse(sessionStorage.getItem(LAST_MODULE_KEY) || 'null'); } catch { return null; } })();
    if (!last?.id) return;
    const toolbar = detail.querySelector('.toolbar');
    if (!toolbar) return;
    let button = toolbar.querySelector('[data-pin-module]');
    if (!button) {
      button = document.createElement('button');
      button.className = 'btn secondary small pin-module';
      button.dataset.pinModule = last.id;
      toolbar.prepend(button);
    }
    const desiredLabel = pins().some(item => item.id === last.id) ? 'Unpin capability' : 'Pin capability';
    if (button.textContent !== desiredLabel) button.textContent = desiredLabel;
  };
  const workspacePanel = () => {
    const content = document.querySelector('#main .content');
    if (!content || currentPage() !== 'overview' || content.querySelector('.workspace-memory')) return;
    const pinned = pins();
    const recent = recents();
    const panel = document.createElement('section');
    panel.className = 'panel workspace-memory';
    panel.innerHTML = `
      <div class="activity-head">
        <div><div class="eyebrow">SESSION WORKSPACE</div><h3>Continue where you left off.</h3><p>Your pins and recent workspaces stay on this device only. They never modify the repository.</p></div>
        <button class="btn secondary small" data-clear-workspace>Clear memory</button>
      </div>
      <div class="workspace-memory-grid">
        <div class="memory-column"><div class="memory-label">PINNED CAPABILITIES</div>${pinned.length ? pinned.map(item => `<button class="memory-item" data-open-module="${esc(item.id)}"><span class="icon-tile blue">◆</span><span><strong>${esc(item.name)}</strong><small>Open in Module Library</small></span><b>→</b></button>`).join('') : '<div class="memory-empty">Pin a capability from its module inspector to keep it one click away.</div>'}</div>
        <div class="memory-column"><div class="memory-label">RECENT WORKSPACES</div>${recent.length ? recent.map(item => `<button class="memory-item" data-recent-page="${esc(item.page)}"><span class="icon-tile">◫</span><span><strong>${esc(item.label)}</strong><small>Resume workspace</small></span><b>→</b></button>`).join('') : '<div class="memory-empty">Your recent workspaces will appear here as you move through ÆtherForge.</div>'}</div>
      </div>`;
    const firstSection = content.querySelector('.section-title');
    content.insertBefore(panel, firstSection || content.firstChild);
  };
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  function enhance() { workspacePanel(); pinButton(); }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-page],[data-goto],[data-module],[data-pin-module],[data-open-module],[data-recent-page],[data-clear-workspace]');
    if (!target) return;
    if (target.dataset.page || target.dataset.goto) rememberPage(target.dataset.page || target.dataset.goto);
    if (target.dataset.module) {
      const module = moduleFromRow(target);
      if (module) { try { sessionStorage.setItem(LAST_MODULE_KEY, JSON.stringify(module)); } catch {} }
      requestAnimationFrame(enhance);
    }
    if (target.dataset.pinModule) {
      let module = null;
      try { module = JSON.parse(sessionStorage.getItem(LAST_MODULE_KEY) || 'null'); } catch {}
      if (module?.id === target.dataset.pinModule) togglePin(module);
    }
    if (target.dataset.openModule) openModule(target.dataset.openModule);
    if (target.dataset.recentPage) { const nav = document.querySelector('[data-page="' + CSS.escape(target.dataset.recentPage) + '"]'); if (nav) nav.click(); }
    if (target.dataset.clearWorkspace) {
      write(PINS_KEY, []); write(RECENT_KEY, []);
      showToast('Session workspace memory cleared.');
      enhance();
    }
  });
  // Observe page replacements only. Observing the full subtree while updating the pin label
  // creates a MutationObserver -> textContent -> MutationObserver feedback loop.
  const observer = new MutationObserver(enhance);
  observer.observe(document.querySelector('#main') || document.body, {childList:true});
  window.addEventListener('storage', enhance);
  enhance();
})();
