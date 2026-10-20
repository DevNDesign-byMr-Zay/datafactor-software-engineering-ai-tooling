/* ÆtherForge Evidence Center 2.0 — additive, fail-closed presentation of maintained receipts. */
const FINGERPRINT = /^[a-f0-9]{64}$/;
const TAB_NAMES = ['decision', 'receipt', 'fingerprint', 'raw'];
const INPUT_IDS = new Set(['receiptText', 'receiptFingerprint', 'previousFingerprint']);
const NO_AUTHORITY = 'NONE';

/**
 * This classifier displays a response from the maintained consumer; it is not
 * a second cryptographic verifier. Unknown/inconsistent responses fail closed.
 * A matching user-supplied fingerprint cannot establish source authenticity.
 */
export function classifyEvidence(payload, receipt, currentFingerprint = '', previousFingerprint = '') {
  const current = typeof currentFingerprint === 'string' ? currentFingerprint.trim() : '';
  const previous = typeof previousFingerprint === 'string' ? previousFingerprint.trim() : '';
  const result = payload && typeof payload === 'object' ? payload.result : null;
  const pending = payload == null;
  const acceptedMarker = receipt !== null && typeof receipt === 'object' &&
    !Array.isArray(receipt) && receipt.accepted === true;
  const validCurrent = FINGERPRINT.test(current);
  const validPrevious = !previous || FINGERPRINT.test(previous);
  const isMaintained = payload?.status === 'checked' && payload?.authority === 'none';
  const recognized = result?.status === 'changed' || result?.status === 'unchanged';
  const matches = validCurrent && result?.fingerprint === current;
  const consistent = result?.status === 'unchanged'
    ? Boolean(previous && previous === current)
    : result?.status === 'changed'
      ? (!previous || previous !== current)
      : false;
  const trusted = Boolean(
    isMaintained && recognized && acceptedMarker && matches && consistent &&
    validPrevious && result?.reason === null
  );
  const verdict = pending ? 'PENDING' : trusted ? result.status.toUpperCase() : 'REJECTED';
  const explicitReason = typeof result?.reason === 'string' && result.reason.trim()
    ? result.reason.trim() : null;
  const localReason = typeof payload?.error === 'string' ? payload.error : null;
  const reason = pending ? 'No evidence evaluated.'
    : trusted ? null
      : localReason || explicitReason || 'Verification result was rejected or inconsistent.';
  const priorState = !previous ? 'not-provided'
    : trusted ? 'verified' : pending ? 'pending' : 'blocked';
  const checks = [
    {
      id: 'receipt', label: 'Receipt acceptance marker',
      state: pending ? 'pending' : acceptedMarker ? 'observed' : 'blocked',
      detail: acceptedMarker
        ? 'accepted: true is present; this is not proof of original source identity.'
        : 'No accepted: true receipt marker established.'
    },
    {
      id: 'fingerprint', label: 'Canonical fingerprint comparison',
      state: pending ? 'pending' : trusted ? 'verified' : 'blocked',
      detail: trusted ? 'The maintained consumer returned a matching receipt fingerprint.'
        : 'A matching canonical receipt fingerprint has not been established.'
    },
    {
      id: 'comparison', label: 'Previous fingerprint relationship',
      state: priorState,
      detail: !previous ? 'No previous fingerprint supplied; this is not historical attestation.'
        : trusted && verdict === 'UNCHANGED' ? 'Previous and current fingerprints match.'
          : trusted ? 'Previous and current fingerprints differ.' : 'Comparison is unverified.'
    },
    {
      id: 'authority', label: 'Execution and deployment authority',
      state: 'bounded',
      detail: 'NONE — this classification never authorizes deployment or external actions.'
    }
  ];
  const explanation = pending ? 'No receipt has been checked by the maintained consumer.'
    : trusted
      ? 'The maintained consumer checked the receipt contract and supplied fingerprint. This is not proof of source authenticity, an external signature, or deployment authorization.'
      : payload?.status === 'local-error'
        ? 'Local input validation refused this request before it reached the maintained consumer.'
        : 'The maintained consumer rejected the receipt, or its response did not meet the fail-closed UI contract. Do not rely on this result.';
  return {
    verdict, trusted, reason, checks, explanation, authority: NO_AUTHORITY,
    fingerprint: trusted ? result.fingerprint : null,
    current, previous,
    receipt: receipt && typeof receipt === 'object' && !Array.isArray(receipt) ? receipt : null,
    source: isMaintained ? 'maintained-library' : pending ? 'none' : payload?.status === 'local-error' ? 'local-precheck' : 'not-verified'
  };
}



/**
 * Each file is a complete replacement, never an incremental merge with prior
 * evidence fields. This avoids silently inheriting an earlier fingerprint.
 */
export function normalizeEvidenceDocument(documentValue) {
  if (!documentValue || typeof documentValue !== 'object' || Array.isArray(documentValue)) {
    throw new TypeError('Receipt must be a JSON object.');
  }
  const receipt = Object.hasOwn(documentValue,'receipt') ? documentValue.receipt : documentValue;
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new TypeError('Receipt must be a JSON object.');
  }
  return {
    receiptText: JSON.stringify(receipt,null,2),
    receiptFingerprint: typeof documentValue.receiptFingerprint === 'string'
      ? documentValue.receiptFingerprint : '',
    previousFingerprint: typeof documentValue.previousFingerprint === 'string'
      ? documentValue.previousFingerprint : ''
  };
}

export async function readEvidenceFile(file) {
  const limit = 64 * 1024;
  if (!file || !Number.isFinite(file.size) || file.size < 0 || file.size > limit) {
    throw new TypeError('Evidence file must be 64 KiB or smaller.');
  }
  const text = await file.text();
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > limit) {
    throw new TypeError('Evidence file exceeds the 64 KiB limit.');
  }
  let value;
  try { value = JSON.parse(text); }
  catch { throw new TypeError('Evidence file must contain valid JSON.'); }
  return normalizeEvidenceDocument(value);
}

export function nextEvidenceTab(current, direction) {
  const index = TAB_NAMES.indexOf(current);
  const start = index < 0 ? 0 : index;
  return TAB_NAMES[(start + TAB_NAMES.length + (direction < 0 ? -1 : 1)) % TAB_NAMES.length];
}

/** Minimal local export: includes fingerprints and verdict, but never the raw receipt. */
export function exportEvidenceVerdict(payload, model) {
  const response = payload?.status === 'checked' ? {
    status: 'checked',
    authority: payload.authority,
    result: {
      status: payload.result?.status,
      fingerprint: payload.result?.fingerprint ?? null,
      reason: payload.result?.reason ?? null
    }
  } : {status:'local-error',error:String(payload?.error || 'Not checked')};
  return {
    date: new Date().toISOString(),
    action: 'receipt',
    source: model.source,
    currentFingerprint: model.current || null,
    previousFingerprint: model.previous || null,
    response,
    decision: {verdict:model.verdict,reason:model.reason,authority:'none'},
    caution: 'A matching submitted fingerprint does not authenticate the source or authorize deployment.'
  };
}

if (typeof document !== 'undefined') {
  let lastVerdict = null;
  let pendingVersion = 0;
  const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function evidencePage() {
    return document.querySelector('#main #receiptText') && document.querySelector('#main #evidenceOutput')
      ? document.querySelector('#main .evidence-shell') : null;
  }

  function setStage(stage) {
    document.querySelectorAll('#main .evidence-stage').forEach(step => {
      const active = step.dataset.evidenceStage === stage;
      step.classList.toggle('active', active);
      if (active) step.setAttribute('aria-current','step');
      else step.removeAttribute('aria-current');
    });
  }

  function setTab(tab) {
    if (!TAB_NAMES.includes(tab)) return;
    const dashboard = document.querySelector('#main #evidenceDashboard');
    if (!dashboard) return;
    dashboard.querySelectorAll('[data-evidence-tab]').forEach(button => {
      const selected = button.dataset.evidenceTab === tab;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    dashboard.querySelectorAll('[data-evidence-panel]').forEach(panel => {
      const selected = panel.dataset.evidencePanel === tab;
      panel.hidden = !selected;
    });
  }

  function appendRow(container, heading, value) {
    const row = document.createElement('div');
    row.className = 'evidence-data-row';
    const label = document.createElement('span');
    label.textContent = heading;
    const content = document.createElement('code');
    content.textContent = String(value ?? 'Not provided');
    row.append(label,content);
    container.appendChild(row);
  }

  function renderEvidence(model) {
    const dashboard = document.querySelector('#main #evidenceDashboard');
    if (!dashboard) return;
    const status = dashboard.querySelector('#evidenceDecisionStatus');
    status.textContent = model.verdict;
    status.className = 'evidence-verdict ' + (model.trusted ? 'checked' : model.verdict === 'PENDING' ? 'pending' : 'rejected');
    dashboard.querySelector('#evidenceDecisionDetail').textContent = model.trusted
      ? model.verdict === 'UNCHANGED'
        ? 'Accepted receipt checked · no fingerprint change detected'
        : 'Accepted receipt checked · fingerprint change detected'
      : model.reason || 'No evidence has been checked.';
    dashboard.querySelector('#evidenceExplanation').textContent = model.explanation;
    dashboard.querySelector('.evidence-explainer h4').textContent = model.trusted ? 'Why this result is trusted' : model.verdict === 'PENDING' ? 'How evidence is checked' : 'Why this result is not trusted';
    dashboard.querySelector('#evidenceAuthority').textContent = 'AUTHORITY: ' + model.authority;
    const checklist = dashboard.querySelector('#evidenceChecks');
    checklist.replaceChildren();
    model.checks.forEach(check => {
      const item = document.createElement('div');
      item.className = 'evidence-check ' + check.state;
      const mark = document.createElement('span');
      mark.className = 'evidence-check-mark';
      mark.textContent = check.state === 'verified' ? '✓' :
        check.state === 'blocked' ? '×' : check.state === 'bounded' ? '⊘' : '•';
      const body = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = check.label;
      const detail = document.createElement('small');
      detail.textContent = check.detail;
      body.append(heading,detail);
      item.append(mark,body);
      checklist.appendChild(item);
    });
    const receiptData = dashboard.querySelector('#evidenceReceiptFields');
    receiptData.replaceChildren();
    appendRow(receiptData,'Acceptance marker',model.receipt?.accepted === true ? 'accepted: true' : 'Not accepted');
    appendRow(receiptData,'Contract version',model.receipt?.contractVersion);
    appendRow(receiptData,'Service',model.receipt?.service?.name);
    appendRow(receiptData,'Revision',model.receipt?.service?.latestReadyRevisionName);
    appendRow(receiptData,'Release stage',model.receipt?.releaseEvidence?.stage);
    const fingerprints = dashboard.querySelector('#evidenceFingerprintFields');
    fingerprints.replaceChildren();
    appendRow(fingerprints,'Submitted current SHA-256',model.current || 'Not supplied');
    appendRow(fingerprints,'Maintained consumer fingerprint',model.fingerprint || 'Not verified');
    appendRow(fingerprints,'Previous SHA-256',model.previous || 'Not supplied');
    appendRow(fingerprints,'Change decision',model.verdict);
    const shortHash = value => value ? value.slice(0,12)+'…'+value.slice(-8) : 'Not provided';
    dashboard.querySelector('#evidenceLineageReceipt').textContent = model.receipt?.service?.name || 'User-supplied receipt';
    dashboard.querySelector('#evidenceLineageCurrent').textContent = shortHash(model.current);
    dashboard.querySelector('#evidenceLineagePrevious').textContent = shortHash(model.previous);
    dashboard.querySelector('#evidenceLineageDecision').textContent = model.verdict;
    dashboard.querySelectorAll('.evidence-lineage-node').forEach(node => {
      node.classList.toggle('checked',model.trusted);
      node.classList.toggle('rejected',model.verdict==='REJECTED');
    });
    setStage(model.verdict === 'PENDING' ? 'load' : model.trusted ? 'decision' : 'verify');
    const download = document.querySelector('#main .evidence-shell [data-download="report"]');
    if (download) download.disabled = !lastVerdict;
  }

  function buildInstrument() {
    const shell=evidencePage();
    if (!shell || document.querySelector('#main #evidenceInstrument')) return;
    lastVerdict=null;
    pendingVersion++;
    const instrument=document.createElement('section');
    instrument.className='evidence-instrument panel';
    instrument.id='evidenceInstrument';
    instrument.innerHTML =
      '<div class="evidence-instrument-head"><div><span class="eyebrow">EVIDENCE CENTER 2.0</span>'+
      '<h2>Every verdict needs a trail.</h2>'+
      '<p>Inspect local, user-supplied receipts through the canonical maintained verifier. No provider authority is granted.</p></div>'+
      '<span class="evidence-boundary">NO DEPLOYMENT AUTHORITY</span></div>'+
      '<ol class="evidence-stage-rail" aria-label="Evidence verification stages">'+
      [['load','01','LOAD'],['normalize','02','NORMALIZE'],['verify','03','VERIFY'],['decision','04','DECISION']].map(([id,number,label]) =>
        '<li class="evidence-stage" data-evidence-stage="'+id+'"><b>'+number+'</b><strong>'+label+'</strong></li>'
      ).join('')+'</ol>';
    shell.parentNode.insertBefore(instrument,shell);
    const raw=document.querySelector('#main #evidenceOutput');
    const dashboard=document.createElement('div');
    dashboard.id='evidenceDashboard';
    dashboard.className='evidence-dashboard';
    dashboard.innerHTML =
      '<div class="evidence-result-head"><div><span class="eyebrow">MAINTAINED VERIFIER</span>'+
      '<h3>Decision instrument</h3></div><span id="evidenceAuthority" class="evidence-boundary">AUTHORITY: NONE</span></div>'+
      '<div class="evidence-tabs" role="tablist" aria-label="Evidence result inspector">'+
      TAB_NAMES.map(name=>'<button type="button" role="tab" data-evidence-tab="'+name+'" aria-selected="false">'+
        escapeText(name === 'raw' ? 'Raw JSON' : name.charAt(0).toUpperCase()+name.slice(1))+'</button>').join('')+'</div>'+
      '<section class="evidence-panel" data-evidence-panel="decision" role="tabpanel">'+
      '<div class="evidence-decision"><div id="evidenceDecisionStatus" aria-live="polite" class="evidence-verdict pending">PENDING</div>'+
      '<p id="evidenceDecisionDetail">No evidence has been verified.</p></div>'+
      '<div class="evidence-explainer"><h4>Why this result is trusted</h4>'+
      '<p id="evidenceExplanation">No evidence has been checked.</p>'+
      '<div id="evidenceChecks" class="evidence-checks"></div></div></section>'+
      '<section class="evidence-panel" data-evidence-panel="receipt" role="tabpanel" hidden>'+
      '<p>Readable receipt attributes are user-supplied; they are not an independent authentication source.</p>'+
      '<div id="evidenceReceiptFields" class="evidence-data"></div></section>'+
      '<section class="evidence-panel" data-evidence-panel="fingerprint" role="tabpanel" hidden>'+
      '<p>SHA-256 fingerprints provide content identity comparisons, not signer identification.</p>'+
      '<div class="evidence-lineage" aria-label="Evidence lineage from receipt to decision">'+
      '<div class="evidence-lineage-node"><small>RECEIPT</small><strong id="evidenceLineageReceipt">User supplied</strong></div>'+
      '<span class="evidence-lineage-arrow" aria-hidden="true">→</span>'+
      '<div class="evidence-lineage-node"><small>CURRENT SHA-256</small><strong id="evidenceLineageCurrent">Not provided</strong></div>'+
      '<span class="evidence-lineage-arrow" aria-hidden="true">↔</span>'+
      '<div class="evidence-lineage-node"><small>PREVIOUS SHA-256</small><strong id="evidenceLineagePrevious">Not provided</strong></div>'+
      '<span class="evidence-lineage-arrow" aria-hidden="true">→</span>'+
      '<div class="evidence-lineage-node"><small>DECISION</small><strong id="evidenceLineageDecision">PENDING</strong></div></div>'+
      '<div id="evidenceFingerprintFields" class="evidence-data"></div></section>'+
      '<section class="evidence-panel" data-evidence-panel="raw" role="tabpanel" hidden></section>';
    raw.parentNode.insertBefore(dashboard,raw);
    dashboard.querySelector('[data-evidence-panel="raw"]').appendChild(raw);
    setTab('decision');
    renderEvidence(classifyEvidence(null,null));
  }

  function rejectLocally(message, receipt, current, previous) {
    const payload={status:'local-error',error:message};
    const model=classifyEvidence(payload,receipt,current,previous);
    lastVerdict=exportEvidenceVerdict(payload,model);
    const raw=document.querySelector('#main #evidenceOutput');
    if(raw)raw.textContent=JSON.stringify(lastVerdict,null,2);
    renderEvidence(model);
  }

  async function verifyEvidence() {
    buildInstrument();
    const text=document.querySelector('#main #receiptText')?.value || '';
    const current=document.querySelector('#main #receiptFingerprint')?.value?.trim() || '';
    const previous=document.querySelector('#main #previousFingerprint')?.value?.trim() || '';
    const currentVersion=++pendingVersion;
    let receipt;
    try { receipt=JSON.parse(text); }
    catch { rejectLocally('Receipt JSON must be valid.',null,current,previous); return; }
    if (!receipt || typeof receipt!=='object' || Array.isArray(receipt)) {
      rejectLocally('Receipt must be a JSON object.',receipt,current,previous); return;
    }
    if (!FINGERPRINT.test(current) || (previous && !FINGERPRINT.test(previous))) {
      rejectLocally('Fingerprints must be lowercase 64-character SHA-256 hex strings.',receipt,current,previous); return;
    }
    const body=JSON.stringify({action:'receipt',inputs:{receipt,receiptFingerprint:current,...(previous?{previousFingerprint:previous}:{})}});
    if (new Blob([body]).size>64*1024) {
      rejectLocally('Evidence request exceeds the 64 KiB local limit.',receipt,current,previous); return;
    }
    setStage('verify');
    const button=document.querySelector('#main #verifyEvidence');
    if(button) button.disabled=true;
    const raw=document.querySelector('#main #evidenceOutput');
    if(raw)raw.textContent='Verifying against the maintained receipt consumer…';
    try {
      const response=await fetch('/api/run',{method:'POST',headers:{'content-type':'application/json'},body});
      const payload=await response.json();
      if(currentVersion!==pendingVersion || !evidencePage())return;
      if (!response.ok) throw new Error(payload.error || 'Maintained verifier refused this request.');
      const model=classifyEvidence(payload,receipt,current,previous);
      lastVerdict=exportEvidenceVerdict(payload,model);
      if(raw) raw.textContent=JSON.stringify(lastVerdict,null,2);
      renderEvidence(model);
      setTab('decision');
    } catch(error) {
      if(currentVersion!==pendingVersion || !evidencePage())return;
      rejectLocally('Verification unavailable or refused: '+String(error.message || error),receipt,current,previous);
      setTab('decision');
    } finally {
      if(currentVersion===pendingVersion && evidencePage() && button) button.disabled=false;
    }
  }

  function downloadVerdict() {
    if(!lastVerdict)return;
    const data=JSON.stringify(lastVerdict,null,2);
    const blob=new Blob([data],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download='aetherforge-evidence-verdict.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }

  document.addEventListener('click',event=>{
    if(!evidencePage())return;
    const target=event.target.closest('button');
    if (!target)return;
    if(target.id==='verifyEvidence'){
      event.preventDefault();event.stopImmediatePropagation();
      void verifyEvidence();
    } else if(target.matches('[data-evidence-tab]')){
      event.preventDefault();event.stopImmediatePropagation();
      setTab(target.dataset.evidenceTab);
    } else if(target.matches('.evidence-shell [data-download="report"]')){
      event.preventDefault();event.stopImmediatePropagation();
      downloadVerdict();
    }
  },true);

  document.addEventListener('keydown',event=>{
    if(!evidencePage() || !event.target?.matches?.('[data-evidence-tab]'))return;
    let next;
    if(event.key==='ArrowRight')next=nextEvidenceTab(event.target.dataset.evidenceTab,1);
    else if(event.key==='ArrowLeft')next=nextEvidenceTab(event.target.dataset.evidenceTab,-1);
    else if(event.key==='Home')next='decision';
    else if(event.key==='End')next='raw';
    if(!next)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setTab(next);
    document.querySelector('#main [data-evidence-tab="'+next+'"]')?.focus();
  },true);

  document.addEventListener('input',event=>{
    if(!evidencePage() || !INPUT_IDS.has(event.target?.id))return;
    pendingVersion++;
    lastVerdict=null;
    const button=document.querySelector('#main #verifyEvidence');
    if(button) button.disabled=false;
    renderEvidence(classifyEvidence(null,null));
    const raw=document.querySelector('#main #evidenceOutput');
    if(raw)raw.textContent='Evidence changed. Verify the revised input to produce a new decision.';
    setStage(event.target.id==='receiptText'?'load':'normalize');
  },true);

  document.addEventListener('change',event=>{
    if(!evidencePage() || event.target?.id!=='receiptFile')return;
    // The legacy app.js loader otherwise runs later in the bubble phase and
    // can restore stale fingerprints. Evidence Center owns this file input.
    event.stopImmediatePropagation();
    const file=event.target.files?.[0];
    const version=++pendingVersion;
    lastVerdict=null;
    const button=document.querySelector('#main #verifyEvidence');
    if(button)button.disabled=false;
    const raw=document.querySelector('#main #evidenceOutput');
    for(const key of ['receiptText','receiptFingerprint','previousFingerprint']){
      const field=document.querySelector('#main #'+key);
      if(field)field.value='';
    }
    renderEvidence(classifyEvidence(null,null));
    setStage('load');
    if(!file){
      if(raw)raw.textContent='Select a JSON receipt to inspect.';
      return;
    }
    if(raw)raw.textContent='Reading the selected receipt locally…';
    void (async()=>{
      try{
        const normalized=await readEvidenceFile(file);
        // A user edit, another file, or page navigation invalidates this load.
        if(version!==pendingVersion || !evidencePage())return;
        for(const key of ['receiptText','receiptFingerprint','previousFingerprint']){
          const field=document.querySelector('#main #'+key);
          if(field)field.value=normalized[key];
        }
        const receipt=JSON.parse(normalized.receiptText);
        renderEvidence(classifyEvidence(null,receipt,normalized.receiptFingerprint,normalized.previousFingerprint));
        setStage('normalize');
        if(raw)raw.textContent='Evidence loaded locally. Review its receipt and fingerprints, then select Verify.';
      }catch(error){
        if(version!==pendingVersion || !evidencePage())return;
        rejectLocally('Evidence file could not be loaded: '+String(error.message||error),null,'','');
        setTab('decision');
      }
    })();
  },true);

  const root=document.querySelector('#main');
  if(root){
    new MutationObserver(()=>buildInstrument()).observe(root,{childList:true,subtree:true});
    buildInstrument();
  }
}
