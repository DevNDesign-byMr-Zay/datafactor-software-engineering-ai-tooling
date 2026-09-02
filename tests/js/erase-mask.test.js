import {
  clampBrushSize,
  clampFeather,
  computeFeatherBlur,
  computeMaskBrushSize,
  computeStrokeSteps,
  mapDisplayPointToMask,
  normalizeBrushShape,
} from '../../src/frontend/erase-mask.js';

describe('canonical erase-mask geometry', () => {
  test('clamps brush size to the authenticated painter range', () => {
    expect(clampBrushSize(2)).toBe(6);
    expect(clampBrushSize(64)).toBe(64);
    expect(clampBrushSize(999)).toBe(220);
    expect(clampBrushSize('bad')).toBe(64);
  });

  test('normalizes supported brush shapes', () => {
    expect(normalizeBrushShape('square')).toBe('square');
    expect(normalizeBrushShape('tri')).toBe('tri');
    expect(normalizeBrushShape('triangle')).toBe('tri');
    expect(normalizeBrushShape('unknown')).toBe('circle');
  });

  test('clamps feather and disables blur while erasing', () => {
    expect(clampFeather(-1)).toBe(0);
    expect(clampFeather(100)).toBe(80);
    expect(computeFeatherBlur(10)).toBe(22.5);
    expect(computeFeatherBlur(10, true)).toBe(0);
  });

  test('computes stroke steps from distance and brush spacing', () => {
    expect(computeStrokeSteps({ distance: 0, brushSize: 64 })).toBe(1);
    expect(computeStrokeSteps({ distance: 100, brushSize: 64 })).toBe(9);
    expect(computeStrokeSteps({ distance: 100, brushSize: 64, forceDot: true })).toBe(1);
  });

  test('maps display coordinates to natural-resolution mask coordinates', () => {
    expect(
      mapDisplayPointToMask({
        x: 50,
        y: 25,
        displayWidth: 100,
        displayHeight: 50,
        maskWidth: 1000,
        maskHeight: 500,
      }),
    ).toEqual({ x: 500, y: 250, sx: 10, sy: 10 });
  });

  test('scales brush size using average mask scale', () => {
    expect(computeMaskBrushSize({ brushSize: 20, sx: 2, sy: 4 })).toBe(60);
  });
});
