/* Direct-file compatibility layer. No network, credentials or backend effects.
   Mirrors only maintained pure numerical helpers; parity checked against src/. */
(() => {
  const finite = (value, name) => {
    if (typeof value !== 'string' && typeof value !== 'number') throw new TypeError(`${name}: invalid input`);
    if (String(value).trim() === '') throw new TypeError(`${name}: required`);
    const n = Number(value);
    if (!Number.isFinite(n)) throw new TypeError(`${name}: must be finite`);
    return n;
  };
  const clampBrushSize = (value, fallback = 64) => { const n = Number(value); return Math.max(6, Math.min(220, Number.isFinite(n) && n > 0 ? n : fallback)); };
  const clampFeather = value => { const n = Number(value); return Math.max(0, Math.min(80, Number.isFinite(n) && n > 0 ? n : 0)); };
  const normalizeBrushShape = value => value === 'square' ? 'square' : value === 'tri' || value === 'triangle' ? 'tri' : 'circle';
  const computeStrokeSteps = ({ distance, brushSize }) => Math.max(1, Math.ceil(Math.max(0, Number(distance) || 0) / Math.max(2, clampBrushSize(brushSize) * 0.18)));
  const calculateSustainabilityEfficiency = ({ durationMs, estimatedEnergyWh, renewableRatio }) => {
    if (!Number.isFinite(durationMs) || durationMs < 0) throw new TypeError('durationMs must be nonnegative');
    if (!Number.isFinite(estimatedEnergyWh) || estimatedEnergyWh < 0) throw new TypeError('estimatedEnergyWh must be nonnegative');
    if (!Number.isFinite(renewableRatio) || renewableRatio < 0 || renewableRatio > 1) throw new TypeError('renewableRatio must be 0 to 1');
    return { energyPerSecondWh: durationMs === 0 ? 0 : estimatedEnergyWh / (durationMs / 1000), renewableAdjustedEnergyWh: estimatedEnergyWh * (1 - renewableRatio) };
  };
  const actions = Object.freeze(['brush', 'energy']);
  const run = (action, inputs) => {
    if (!actions.includes(action)) throw new Error('This operation needs the localhost adapter. Open START-AETHERFORGE.cmd to enable maintained source verification.');
    if (!inputs || typeof inputs !== 'object') throw new TypeError('Valid workflow inputs required');
    let result;
    if (action === 'brush') {
      const brushSize = finite(inputs.brushSize, 'brushSize');
      const distance = finite(inputs.distance, 'distance');
      const feather = finite(inputs.feather, 'feather');
      if (brushSize < 1 || brushSize > 220 || distance < 0 || feather < 0 || feather > 80) throw new RangeError('Inputs outside safe bounds');
      result = { brushSize: clampBrushSize(brushSize), shape: normalizeBrushShape(inputs.shape), feather: clampFeather(feather), strokeSteps: computeStrokeSteps({ distance, brushSize }) };
    } else {
      result = calculateSustainabilityEfficiency({ durationMs: finite(inputs.durationMs, 'durationMs'), estimatedEnergyWh: finite(inputs.estimatedEnergyWh, 'estimatedEnergyWh'), renewableRatio: finite(inputs.renewableRatio, 'renewableRatio') });
    }
    return { status: 'computed', source: 'offline-compatible-calculator', hardwareVerified: false, externallyVerified: false, executed: true, result };
  };
  const api = Object.freeze({ supportedActions: actions, run });
  // Exposed for a direct-file UI and automated parity checks, without model credentials.
  if (typeof window !== 'undefined') window.AetherForgeOffline = api;
})();
