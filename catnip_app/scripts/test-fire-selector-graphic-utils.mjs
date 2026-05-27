/**
 * Standalone sizing tests (no TS path aliases). Run: npm test
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pivots = JSON.parse(
  readFileSync(join(root, 'src/replicas/fire-selector-pivots.json'), 'utf8'),
);

const M4_ASPECT = 512 / 1024;
const AK_ASPECT = 176.67398 / 52.871712;
const M4_PIVOT = pivots.M4;
const AK_PIVOT = pivots.AK;
const M4_LAYOUT_SLOTS = [0, 90, 180, 270];
const AK_LAYOUT_SLOTS = [0, 10, 16];
const REFERENCE_GRAPHIC_SCALE = 100;
const M4_LAYOUT_INSET = 0.08;
const AK_LAYOUT_INSET = 0;
const MIN_LAYOUT_INSET_PX = 4;
const DEFAULT_ARC_STEP_DEG = 1;
const MAX_ROTATION_SAMPLES = 360;

function pivotToPixel(pivot, width, height) {
  return { px: pivot.x * width, py: pivot.y * height };
}

function boundsAfterRotationAroundPivot(width, height, pivot, rotationDeg) {
  const { px, py } = pivotToPixel(pivot, width, height);
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of corners) {
    const dx = x - px;
    const dy = y - py;
    const rx = px + dx * cos - dy * sin;
    const ry = py + dx * sin + dy * cos;
    minX = Math.min(minX, rx);
    minY = Math.min(minY, ry);
    maxX = Math.max(maxX, rx);
    maxY = Math.max(maxY, ry);
  }
  return { width: maxX - minX, height: maxY - minY };
}

function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

function samplesAlongShortestArc(fromDeg, toDeg, stepDeg) {
  const delta = ((toDeg - fromDeg) % 360 + 540) % 360 - 180;
  if (delta === 0 || stepDeg <= 0) {
    return [];
  }
  const samples = [];
  const steps = Math.floor(Math.abs(delta) / stepDeg);
  const direction = delta > 0 ? 1 : -1;
  for (let i = 1; i < steps; i++) {
    samples.push(normalizeDeg(fromDeg + direction * i * stepDeg));
  }
  return samples;
}

function buildRotationSamples(slotRotationsDeg, stepDeg = DEFAULT_ARC_STEP_DEG) {
  if (slotRotationsDeg.length === 0) {
    return [0];
  }
  const sorted = [...new Set(slotRotationsDeg.map(normalizeDeg))].sort((a, b) => a - b);
  const result = new Set(sorted);
  for (let index = 0; index < sorted.length; index++) {
    const fromDeg = sorted[index];
    const toDeg = sorted[(index + 1) % sorted.length];
    for (const deg of samplesAlongShortestArc(fromDeg, toDeg, stepDeg)) {
      result.add(deg);
      if (result.size >= MAX_ROTATION_SAMPLES) {
        return [...result];
      }
    }
  }
  return [...result];
}

function strokePaddingPx(config, graphicWidth, graphicHeight) {
  const strokeY = (config.viewBoxStrokeWidth / config.viewBoxHeight) * graphicHeight;
  const strokeX = (config.viewBoxStrokeWidth / config.viewBoxWidth) * graphicWidth;
  return Math.max(strokeX, strokeY);
}

function layoutPaddingPx(containerWidth, containerHeight, insetRatio) {
  if (insetRatio <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return 0;
  }
  return Math.max(
    MIN_LAYOUT_INSET_PX,
    Math.round(Math.min(containerWidth, containerHeight) * insetRatio),
  );
}

function computeSweptLayout({
  aspect,
  pivot,
  rotationSamples,
  scale,
  replicaConfig,
}) {
  const graphicHeight = scale;
  const graphicWidth = scale * aspect;
  let containerWidth = 0;
  let containerHeight = 0;
  for (const rotationDeg of rotationSamples) {
    const bounds = boundsAfterRotationAroundPivot(
      graphicWidth,
      graphicHeight,
      pivot,
      rotationDeg,
    );
    containerWidth = Math.max(containerWidth, bounds.width);
    containerHeight = Math.max(containerHeight, bounds.height);
  }
  if (replicaConfig) {
    const strokePad = strokePaddingPx(replicaConfig, graphicWidth, graphicHeight);
    containerWidth += strokePad * 2;
    containerHeight += strokePad * 2;
    const layoutPad = layoutPaddingPx(
      containerWidth,
      containerHeight,
      replicaConfig.layoutInsetRatio,
    );
    containerWidth += layoutPad * 2;
    containerHeight += layoutPad * 2;
  }
  return { graphicWidth, graphicHeight, containerWidth, containerHeight };
}

function scaleToFitMaxBox({
  aspect,
  pivot,
  rotationSamples,
  maxWidth,
  maxHeight,
  replicaConfig,
}) {
  if (maxWidth <= 0 || maxHeight <= 0 || rotationSamples.length === 0) {
    return 0;
  }
  const ref = computeSweptLayout({
    aspect,
    pivot,
    rotationSamples,
    scale: REFERENCE_GRAPHIC_SCALE,
    replicaConfig,
  });
  const selectorMaxAxis = Math.max(ref.containerWidth, ref.containerHeight);
  if (selectorMaxAxis <= 0) {
    return 0;
  }
  const boxLimit = Math.min(maxWidth, maxHeight);
  let scale = (boxLimit / selectorMaxAxis) * REFERENCE_GRAPHIC_SCALE;
  for (let pass = 0; pass < 4; pass++) {
    const layout = computeSweptLayout({
      aspect,
      pivot,
      rotationSamples,
      scale,
      replicaConfig,
    });
    if (layout.containerWidth <= maxWidth && layout.containerHeight <= maxHeight) {
      return scale;
    }
    const scaleW = (maxWidth / layout.containerWidth) * scale;
    const scaleH = (maxHeight / layout.containerHeight) * scale;
    scale = Math.min(scale, scaleW, scaleH);
  }
  return scale > 0 ? scale : 0;
}

const M4_CONFIG = {
  viewBoxWidth: 512,
  viewBoxHeight: 1024,
  viewBoxStrokeWidth: 12,
  layoutInsetRatio: M4_LAYOUT_INSET,
};

const AK_CONFIG = {
  viewBoxWidth: 176.67398,
  viewBoxHeight: 52.871712,
  viewBoxStrokeWidth: 12,
  layoutInsetRatio: AK_LAYOUT_INSET,
};

const M4_SAMPLES = buildRotationSamples(M4_LAYOUT_SLOTS);
const AK_SAMPLES = buildRotationSamples(AK_LAYOUT_SLOTS);

function fitGraphicForReplicaM4(scale) {
  return computeSweptLayout({
    aspect: M4_ASPECT,
    pivot: M4_PIVOT,
    rotationSamples: M4_SAMPLES,
    scale,
    replicaConfig: M4_CONFIG,
  });
}

function fitGraphicForReplicaAk(scale) {
  return computeSweptLayout({
    aspect: AK_ASPECT,
    pivot: AK_PIVOT,
    rotationSamples: AK_SAMPLES,
    scale,
    replicaConfig: AK_CONFIG,
  });
}

function graphicContainerOverflow(gw, gh, cw, ch, pivot, rotations) {
  let maxOverflowW = 0;
  let maxOverflowH = 0;
  let worstRotationDeg = null;
  for (const rotationDeg of rotations) {
    const b = boundsAfterRotationAroundPivot(gw, gh, pivot, rotationDeg);
    const overflowW = b.width - cw;
    const overflowH = b.height - ch;
    if (overflowW > maxOverflowW || overflowH > maxOverflowH) {
      maxOverflowW = Math.max(maxOverflowW, overflowW);
      maxOverflowH = Math.max(maxOverflowH, overflowH);
      worstRotationDeg = rotationDeg;
    }
  }
  return { maxOverflowW, maxOverflowH, worstRotationDeg };
}

describe('fire-selector sweep sizing', () => {
  it('M4 swept container without padding equals pivot-bounds union at slots', () => {
    const scale = 200;
    const swept = computeSweptLayout({
      aspect: M4_ASPECT,
      pivot: M4_PIVOT,
      rotationSamples: M4_LAYOUT_SLOTS,
      scale,
    });
    let maxW = 0;
    let maxH = 0;
    for (const rotationDeg of M4_LAYOUT_SLOTS) {
      const bounds = boundsAfterRotationAroundPivot(
        swept.graphicWidth,
        swept.graphicHeight,
        M4_PIVOT,
        rotationDeg,
      );
      maxW = Math.max(maxW, bounds.width);
      maxH = Math.max(maxH, bounds.height);
    }
    assert.ok(Math.abs(swept.containerWidth - maxW) < 0.01);
    assert.ok(Math.abs(swept.containerHeight - maxH) < 0.01);
  });

  it('M4 union container fits pivot bounds at every layout slot', () => {
    const scale = 200;
    const swept = fitGraphicForReplicaM4(scale);
    for (const rotationDeg of M4_LAYOUT_SLOTS) {
      const bounds = boundsAfterRotationAroundPivot(
        swept.graphicWidth,
        swept.graphicHeight,
        M4_PIVOT,
        rotationDeg,
      );
      assert.ok(bounds.width <= swept.containerWidth + 0.01);
      assert.ok(bounds.height <= swept.containerHeight + 0.01);
    }
  });

  it('M4 container at 90° fits inside union (east/west clip regression)', () => {
    const scale = 220;
    const swept = fitGraphicForReplicaM4(scale);
    const at90 = boundsAfterRotationAroundPivot(
      swept.graphicWidth,
      swept.graphicHeight,
      M4_PIVOT,
      90,
    );
    assert.ok(swept.containerWidth >= at90.width - 0.01);
    assert.ok(swept.containerHeight >= at90.height - 0.01);
  });

  it('M4 swept container has no overflow at arc sample rotations', () => {
    const scale = 200;
    const swept = fitGraphicForReplicaM4(scale);
    const overflow = graphicContainerOverflow(
      swept.graphicWidth,
      swept.graphicHeight,
      swept.containerWidth,
      swept.containerHeight,
      M4_PIVOT,
      M4_SAMPLES,
    );
    assert.ok(overflow.maxOverflowW <= 0.01);
    assert.ok(overflow.maxOverflowH <= 0.01);
  });

  it('AK sample count stays small (no global 0–359 sweep)', () => {
    assert.ok(AK_SAMPLES.length < 30);
    assert.ok(!AK_SAMPLES.includes(90));
    assert.ok(!AK_SAMPLES.includes(180));
  });

  it('AK slot union is not inflated by a full 0–359° sweep', () => {
    const scale = 200;
    const slotUnion = fitGraphicForReplicaAk(scale);
    const fullCircle = computeSweptLayout({
      aspect: AK_ASPECT,
      pivot: AK_PIVOT,
      rotationSamples: Array.from({ length: 360 }, (_, index) => index),
      scale,
      replicaConfig: AK_CONFIG,
    });
    assert.ok(slotUnion.containerWidth < fullCircle.containerWidth);
    assert.ok(slotUnion.containerHeight < fullCircle.containerHeight);
  });

  it('scaleToFitMaxBox fits parent box for M4', () => {
    const maxWidth = 280;
    const maxHeight = 400;
    const scale = scaleToFitMaxBox({
      aspect: M4_ASPECT,
      pivot: M4_PIVOT,
      rotationSamples: M4_SAMPLES,
      maxWidth,
      maxHeight,
      replicaConfig: M4_CONFIG,
    });
    const swept = fitGraphicForReplicaM4(scale);
    assert.ok(swept.containerWidth <= maxWidth + 0.01);
    assert.ok(swept.containerHeight <= maxHeight + 0.01);
    const smallerBox = scaleToFitMaxBox({
      aspect: M4_ASPECT,
      pivot: M4_PIVOT,
      rotationSamples: M4_SAMPLES,
      maxWidth: maxWidth * 0.5,
      maxHeight: maxHeight * 0.5,
      replicaConfig: M4_CONFIG,
    });
    assert.ok(smallerBox <= scale);
  });

  it('scaleToFitMaxBox uses default-size swept bounds and longest axis', () => {
    const maxWidth = 320;
    const maxHeight = 350;
    const ref = fitGraphicForReplicaAk(REFERENCE_GRAPHIC_SCALE);
    const selectorMaxAxis = Math.max(ref.containerWidth, ref.containerHeight);
    const expected = (Math.min(maxWidth, maxHeight) / selectorMaxAxis) * REFERENCE_GRAPHIC_SCALE;
    const scale = scaleToFitMaxBox({
      aspect: AK_ASPECT,
      pivot: AK_PIVOT,
      rotationSamples: AK_SAMPLES,
      maxWidth,
      maxHeight,
      replicaConfig: AK_CONFIG,
    });
    assert.ok(Math.abs(scale - expected) < 1.5);
  });

  it('M4 arc samples include mid-quadrant angles between slots', () => {
    assert.ok(M4_SAMPLES.includes(45));
    assert.ok(M4_SAMPLES.includes(135));
  });

  it('AK scaleToFitMaxBox never exceeds parent width or height', () => {
    const maxWidth = 320;
    const maxHeight = 350;
    const scale = scaleToFitMaxBox({
      aspect: AK_ASPECT,
      pivot: AK_PIVOT,
      rotationSamples: AK_SAMPLES,
      maxWidth,
      maxHeight,
      replicaConfig: AK_CONFIG,
    });
    const swept = fitGraphicForReplicaAk(scale);
    assert.ok(swept.containerWidth <= maxWidth + 0.01);
    assert.ok(swept.containerHeight <= maxHeight + 0.01);
  });

  it('scaleToFitMaxBox shrinks when parent is narrow', () => {
    const scale = scaleToFitMaxBox({
      aspect: AK_ASPECT,
      pivot: AK_PIVOT,
      rotationSamples: AK_SAMPLES,
      maxWidth: 260,
      maxHeight: 350,
      replicaConfig: AK_CONFIG,
    });
    assert.ok(scale > 0);
    const swept = fitGraphicForReplicaAk(scale);
    assert.ok(swept.containerWidth <= 260 + 0.01);
    assert.ok(swept.containerHeight <= 350 + 0.01);
  });
});
