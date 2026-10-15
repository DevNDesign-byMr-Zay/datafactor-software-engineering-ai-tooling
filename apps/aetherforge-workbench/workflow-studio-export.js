/* ÆtherForge Workflow Studio export guard — keeps report downloads scoped to this instrument. */
(() => {
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-download="report"]');
    if (!button || !document.querySelector('#workflowStudioInstrument')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const output = document.querySelector('#workflowOutput');
    if (!output) return;
    let payload;
    try { payload = JSON.parse(output.textContent); } catch {
      const state = document.querySelector('#workflowState');
      if (state) { state.textContent = 'Run a workflow before exporting'; state.className = 'state bad'; }
      return;
    }
    const active = document.querySelector('[data-workflow-stage].active')?.dataset.workflowStage;
    if (active !== 'result') return;
    const action = document.querySelector('[data-workflow-run]')?.dataset.workflowRun || 'workflow';
    const blob = new Blob([JSON.stringify({ action, result: payload }, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `aetherforge-${action}-result.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 500);
  }, true);
})();
