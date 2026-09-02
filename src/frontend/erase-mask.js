// Canonical maintained extraction from authenticated Aster erase/remove painter history.
// Historical source files remain immutable provenance under Software Engineering & AI Tooling/.

export function clampBrushSize(value, fallback = 64) {
  const numeric = Number(value);
  const resolved = Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
  return Math.max(6, Math.min(220, resolved));
}

export function normalizeBrushShape(value) {
  if (value === 'square') return 'square';
  if (value === 'tri' || value === 'triangle') return 'tri';
  return 'circle';
}

export function clampFeather(value) {
  const numeric = Number(value);
  const resolved = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  return Math.max(0, Math.min(80, resolved));
}

export function computeStrokeSteps({ distance, brushSize, forceDot = false }) {
  if (forceDot) return 1;
  const spacing = Math.max(2, clampBrushSize(brushSize) * 0.18);
  return Math.max(1, Math.ceil(Math.max(0, Number(distance) || 0) / spacing));
}

export function mapDisplayPointToMask({
  x,
  y,
  displayWidth,
  displayHeight,
  maskWidth,
  maskHeight,
}) {
  const width = Math.max(1, Number(displayWidth) || 1);
  const height = Math.max(1, Number(displayHeight) || 1);
  const sx = Math.max(1, Number(maskWidth) || 1) / width;
  const sy = Math.max(1, Number(maskHeight) || 1) / height;
  return { x: Number(x) * sx, y: Number(y) * sy, sx, sy };
}

export function computeMaskBrushSize({ brushSize, sx, sy }) {
  return clampBrushSize(brushSize) * ((Number(sx) + Number(sy)) / 2);
}

export function computeFeatherBlur(feather, isErase = false) {
  if (isErase) return 0;
  return Math.min(80, clampFeather(feather) * 2.25);
}
