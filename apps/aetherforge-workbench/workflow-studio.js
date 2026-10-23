/* ÆtherForge Workflow Studio 2.0 — additive UI instrumentation only. */
(() => {
  const STORAGE_KEY = 'aetherforge-workflow-history';
  const PRESETS = Object.freeze({
    cloud: {
      safe: { label: 'Safe local plan', values: { serviceName: 'aetherforge-example', region: 'us-central1' } },
      release: { label: 'Release review', values: { serviceName: 'aetherforge-release-review', region: 'us-east1' } }
    },
    brush: {
      precision: { label: 'Precision', values: { brushSize: '48', distance: '90', feather: '10', shape: 'circle' } },
      broad: { label: 'Broad mask', values: { brushSize: '180', distance: '160', feather: '48', shape: 'square' } }
    },
    holo: {
      inspection: { label: 'Inspection', values: { snapshotId: 'design-001', provenanceRef: 'user-provided-01', intent: 'Inspect a selected reference object' } },
      presentation: { label: 'Presentation', values: { snapshotId: 'presentation-001', provenanceRef: 'user-provided-02', intent: 'Prepare a renderer-neutral spatial presentation plan' } }
    }
  });
  const fieldMap = {
    cloud: ['serviceName', 'region'],
    brush: ['brushSize', 'distance', 'feather', 'shape'],
    holo: ['snapshotId', 'provenanceRef', 'intent']
  };
  const labels = { cloud: 'Cloud Run Preflight', brush: 'Brush Geometry', holo: 'Holographic Scene' };
  let currentAction = 'cloud';
  let currentPayload = null;

  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const qs = selector => document.querySelector(selector);
  const qsa = selector => [...document.querySelectorAll(selector)];
  const value = id => document.getElementById(id)?.value?.trim() ?? '';

  function readHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch { return []; }
  }

  function writeHistory(entry) {
    try {
      const history = [entry, ...readHistory()].slice(0, 8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      return history;
    } catch { return [entry]; }
  }

  function setStage(stage) {
    const allowed = new Set(['input', 'validate', 'result']);
    if (!allowed.has(stage)) return;
    qsa('[data-workflow-stage]').forEach(button => {
      const active = button.dataset.workflowStage === stage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'step' : 'false');
    });
    qsa('[data-stage-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.stagePanel === stage));
  }

  function clearValidation(card) {
    card?.querySelectorAll('.validation-error').forEach(node => node.remove());
    card?.querySelectorAll('.field.invalid').forEach(node => node.classList.remove('invalid'));
  }

  function validateWorkflow(name) {
    const card = qs(`[data-studio-card][data-workflow-id="${CSS.escape(name)}"]`);
    clearValidation(card);
    const errors = [];
    for (const id of fieldMap[name] || []) {
      const field = document.getElementById(id);
      if (!field || !value(id)) {
        errors.push({ id, message: 'Required workflow input is missing.' });
        field?.classList.add('invalid');
      }
    }
    if (name === 'brush') {
      const brush = Number(value('brushSize'));
      const feather = Number(value('feather'));
      const distance = Number(value('distance'));
      if (Number.isNaN(brush) || brush < 1 || brush > 220) errors.push({ id: 'brushSize', message: 'Brush size must be between 1 and 220.' });
      if (Number.isNaN(feather) || feather < 0 || feather > 80) errors.push({ id: 'feather', message: 'Feather must be between 0 and 80.' });
      if (Number.isNaN(distance) || distance < 0) errors.push({ id: 'distance', message: 'Stroke distance cannot be negative.' });
    }
    if (name === 'cloud' && value('serviceName') && !/^[a-z0-9][a-z0-9-]{0,62}$/.test(value('serviceName'))) errors.push({ id: 'serviceName', message: 'Use lowercase letters, numbers and hyphens.' });
    if (errors.length) {
      for (const error of errors) {
        const field = document.getElementById(error.id);
        if (!field) continue;
        field.classList.add('invalid');
        const message = document.createElement('div');
        message.className = 'validation-error';
        message.textContent = error.message;
        field.closest('.formrow')?.appendChild(message);
      }
      return false;
    }
    return true;
  }

  function applyPreset(name, preset, announce = true) {
    const definition = PRESETS[name]?.[preset];
    if (!definition) return false;
    for (const [id, next] of Object.entries(definition.values)) {
      const field = document.getElementById(id);
      if (!field) continue;
      field.value = next;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const card = qs(`[data-studio-card][data-workflow-id="${CSS.escape(name)}"]`);
    clearValidation(card);
    card?.querySelectorAll('.preset-button').forEach(button => button.classList.toggle('active', button.dataset.preset === preset));
    if (announce) setStudioState('Preset loaded · ready to validate', 'ready');
    return true;
  }

  function setStudioState(text, tone = 'ready') {
    const state = qs('#workflowState');
    if (state) { state.textContent = text; state.className = `state ${tone}`; }
  }

  function renderInspector(payload, actionName) {
    currentPayload = payload;
    const summary = payload?.executed === false ? 'PLAN GENERATED · NO SIDE EFFECTS' : 'LIBRARY RESULT VERIFIED';
    const provenance = {
      source: 'maintained-library',
      action: actionName,
      advisoryOnly: payload?.advisoryOnly === true,
      authority: payload?.executed === false ? 'none' : 'bounded local function',
      generatedAt: new Date().toISOString()
    };
    const constraints = {
      cloudMutation: false,
      externalProvider: false,
      repositoryMutation: false,
      autonomousExecution: false
    };
    const summaryHtml = `<div class="inspector-summary"><span class="inspector-state">${esc(summary)}</span><strong>${esc(labels[actionName] || actionName)}</strong><p>${esc(actionName === 'cloud' ? 'Deployment arguments were planned only.' : actionName === 'holo' ? 'Spatial output is advisory and physical actuation remains disabled.' : 'The maintained function returned a bounded local calculation.')}</p></div>`;
    const raw = JSON.stringify(payload, null, 2);
    const provenanceHtml = `<div class="inspector-list">${Object.entries(provenance).map(([key, val]) => `<div><span>${esc(key)}</span><code>${esc(val)}</code></div>`).join('')}</div>`;
    const constraintsHtml = `<div class="inspector-list">${Object.entries(constraints).map(([key, val]) => `<div><span>${esc(key)}</span><code>${val ? 'ENABLED' : 'BLOCKED'}</code></div>`).join('')}</div>`;
    const tabs = { summary: summaryHtml, raw: `<pre class="outbox compact">${esc(raw)}</pre>`, provenance: provenanceHtml, constraints: constraintsHtml };
    const pane = qs('#workflowInspectorPane');
    if (pane) pane.innerHTML = tabs[qs('.result-tab.active')?.dataset.resultTab || 'summary'] || summaryHtml;
    qsa('.result-tab').forEach(tab => {
      tab.onclick = () => {
        qsa('.result-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (pane) pane.innerHTML = tabs[tab.dataset.resultTab];
      };
    });
  }

  async function executeWorkflow(name) {
    setStage('validate');
    if (!validateWorkflow(name)) {
      setStudioState('Validation blocked · fix required inputs', 'bad');
      return;
    }
    const inputs = Object.fromEntries((fieldMap[name] || []).map(id => [id, value(id)]));
    setStudioState('Running maintained function…', 'working');
    const output = qs('#workflowOutput');
    if (output) output.textContent = 'Validating with the maintained library…';
    try {
      const response = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: name, inputs }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Validation refused');
      currentAction = name;
      currentPayload = payload;
      if (output) output.textContent = JSON.stringify(payload, null, 2);
      setStage('result');
      setStudioState(payload.executed === false ? 'Plan generated · no side effects' : 'Library function completed · bounded result', 'good');
      renderInspector(payload, name);
      const history = writeHistory({ id: `${Date.now()}-${name}`, action: name, label: labels[name], status: payload.executed === false ? 'planned' : 'verified', at: new Date().toISOString() });
      renderHistory(history);
    } catch (error) {
      if (output) output.textContent = `Validation was refused: ${error.message}`;
      setStage('validate');
      setStudioState('Validation refused', 'bad');
    }
  }

  function renderHistory(history = readHistory()) {
    const host = qs('#workflowHistoryList');
    if (!host) return;
    host.innerHTML = history.length ? history.map(entry => `<button class="history-item" data-history-action="${esc(entry.action)}"><span class="history-dot ${esc(entry.status)}"></span><span><strong>${esc(entry.label)}</strong><small>${esc(entry.status.toUpperCase())} · ${esc(new Date(entry.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</small></span><b>↗</b></button>`).join('') : '<div class="history-empty">No local workflow runs yet. Results you generate here stay in this browser session history.</div>';
  }

  function enhanceCard(card, name) {
    if (!card || card.dataset.workflowEnhanced === 'true') return;
    card.dataset.workflowEnhanced = 'true';
    card.dataset.workflowId = name;
    const presets = PRESETS[name] || {};
    const head = card.querySelector('.studio-card-head');
    if (head) {
      const rail = document.createElement('div');
      rail.className = 'preset-rail';
      rail.innerHTML = '<span>PRESETS</span>' + Object.entries(presets).map(([key, preset]) => `<button type="button" class="preset-button" data-preset="${esc(key)}" data-preset-action="${esc(name)}">${esc(preset.label)}</button>`).join('');
      head.parentElement.insertBefore(rail, card.querySelector('.formgrid'));
    }
    const run = card.querySelector('[data-run]');
    if (run) { run.dataset.workflowRun = name; run.textContent = `Validate & run ${labels[name]} →`; }
  }

  function enhanceStudio() {
    const studioHero = qs('.studio-hero');
    if (!studioHero || qs('#workflowStudioInstrument')) return;
    const cards = qsa('.studio-card');
    ['cloud', 'brush', 'holo'].forEach((name, index) => enhanceCard(cards[index], name));
    const stage = document.createElement('section');
    stage.id = 'workflowStudioInstrument';
    stage.className = 'workflow-instrument panel';
    stage.innerHTML = `<div class="workflow-instrument-head"><div><span class="eyebrow">ENGINEERING INSTRUMENT</span><h3>Workflow command deck</h3><p>Configure inputs, validate the boundary, then inspect the exact maintained result.</p></div><span class="pill cyan">LOCAL SESSION</span></div><div class="workflow-stage-rail" role="list" aria-label="Workflow stages"><button type="button" class="workflow-stage active" data-workflow-stage="input" aria-current="step"><span>01</span><strong>INPUT</strong><small>Configure</small></button><i>→</i><button type="button" class="workflow-stage" data-workflow-stage="validate" aria-current="false"><span>02</span><strong>VALIDATE</strong><small>Check boundary</small></button><i>→</i><button type="button" class="workflow-stage" data-workflow-stage="result" aria-current="false"><span>03</span><strong>RESULT</strong><small>Inspect receipt</small></button></div><div class="workflow-stage-panels"><div data-stage-panel="input" class="stage-panel active"><span class="stage-kicker">INPUT</span><strong>Choose a maintained workflow above.</strong><small>Presets only populate fields; they never execute a workflow.</small></div><div data-stage-panel="validate" class="stage-panel"><span class="stage-kicker">VALIDATE</span><strong>Required fields and bounded values are checked locally before the adapter is called.</strong><small>Validation failures stop here.</small></div><div data-stage-panel="result" class="stage-panel"><span class="stage-kicker">RESULT</span><strong>Inspect the maintained response, provenance and constraints.</strong><small>Cloud mutations and autonomous execution remain disabled.</small></div></div></section>`;
    studioHero.parentElement.insertBefore(stage, studioHero.nextSibling);

    const result = qs('.result-panel');
    if (result) {
      result.innerHTML = `<div class="activity-head"><div><span class="eyebrow">RESULT INSPECTOR</span><h3>Verified library output</h3><p>The workbench separates the human-readable verdict from raw output and boundary metadata.</p></div><span class="state" id="workflowState">Ready</span></div><div class="result-tabs" role="tablist"><button type="button" class="result-tab active" data-result-tab="summary">Summary</button><button type="button" class="result-tab" data-result-tab="raw">Raw JSON</button><button type="button" class="result-tab" data-result-tab="provenance">Provenance</button><button type="button" class="result-tab" data-result-tab="constraints">Constraints</button></div><div id="workflowInspectorPane" class="inspector-pane"><div class="inspector-summary"><span class="inspector-state">READY</span><strong>Awaiting a validated workflow</strong><p>Run one of the maintained operations to populate the inspector.</p></div></div><pre class="outbox" id="workflowOutput" hidden>Awaiting input.</pre><div class="toolbar"><button class="btn secondary small" data-download="report">Download result JSON ↓</button><button class="btn secondary small" data-goto="evidence">Inspect evidence →</button></div>`;
    }
    const historyPanel = document.createElement('section');
    historyPanel.className = 'panel workflow-history';
    historyPanel.innerHTML = `<div class="activity-head"><div><span class="eyebrow">LOCAL SESSION</span><h3>Workflow history</h3><p>Device-local history only. No GitHub, scoring or repository telemetry is recorded here.</p></div><button type="button" class="btn secondary small" data-history-clear>Clear history</button></div><div id="workflowHistoryList"></div>`;
    result?.parentElement.appendChild(historyPanel);
    renderHistory();
    setStage('input');
  }

  document.addEventListener('click', event => {
    const preset = event.target.closest('[data-preset-action]');
    if (preset) {
      event.preventDefault();
      event.stopImmediatePropagation();
      applyPreset(preset.dataset.presetAction, preset.dataset.preset, true);
      return;
    }
    const run = event.target.closest('[data-workflow-run]');
    if (run) {
      event.preventDefault();
      event.stopImmediatePropagation();
      executeWorkflow(run.dataset.workflowRun);
      return;
    }
    const stage = event.target.closest('[data-workflow-stage]');
    if (stage) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setStage(stage.dataset.workflowStage);
      return;
    }
    const clear = event.target.closest('[data-history-clear]');
    if (clear) {
      event.preventDefault();
      event.stopImmediatePropagation();
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      renderHistory([]);
      return;
    }
  }, true);

  const observer = new MutationObserver(() => enhanceStudio());
  function boot() {
    enhanceStudio();
    const main = qs('#main');
    if (main) observer.observe(main, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
