import { getFireSelectorLayout } from '@/replicas/fire-selector-layout';
import {
  getFireSelectorReplicaConfig,
  type FireSelectorReplicaConfig,
} from '@/replicas/fire-selector-replica-config';
import {
  boundsAfterRotationAroundPivot,
  type FireSelectorPivot,
} from '@/replicas/fire-selector-pivot-math';
import type { ReplicaType } from '@/replicas/types';

const DEFAULT_ARC_STEP_DEG = 1;
const MAX_ROTATION_SAMPLES = 360;
const MIN_LAYOUT_INSET_PX = 4;

/** Graphic height (px) used to measure the swept bounding box before scaling to the parent. */
export const REFERENCE_GRAPHIC_SCALE = 100;

export type SweptLayoutResult = {
  graphicWidth: number;
  graphicHeight: number;
  containerWidth: number;
  containerHeight: number;
};

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Degrees along the shortest arc from `fromDeg` to `toDeg`, excluding endpoints. */
function samplesAlongShortestArc(
  fromDeg: number,
  toDeg: number,
  stepDeg: number,
): number[] {
  const delta = ((toDeg - fromDeg) % 360 + 540) % 360 - 180;
  if (delta === 0 || stepDeg <= 0) {
    return [];
  }

  const samples: number[] = [];
  const steps = Math.floor(Math.abs(delta) / stepDeg);
  const direction = delta > 0 ? 1 : -1;

  for (let i = 1; i < steps; i++) {
    samples.push(normalizeDeg(fromDeg + direction * i * stepDeg));
  }

  return samples;
}

/**
 * Slot angles plus stepped samples along shortest arcs between consecutive slots (circular).
 * Used for union of pivot-rotated layout bounds.
 */
export function buildRotationSamples(
  slotRotationsDeg: number[],
  stepDeg: number = DEFAULT_ARC_STEP_DEG,
): number[] {
  if (slotRotationsDeg.length === 0) {
    return [0];
  }

  const sorted = [...new Set(slotRotationsDeg.map(normalizeDeg))].sort((a, b) => a - b);
  const result = new Set<number>(sorted);

  for (let index = 0; index < sorted.length; index++) {
    const fromDeg = sorted[index]!;
    const toDeg = sorted[(index + 1) % sorted.length]!;

    for (const deg of samplesAlongShortestArc(fromDeg, toDeg, stepDeg)) {
      result.add(deg);
      if (result.size >= MAX_ROTATION_SAMPLES) {
        return [...result];
      }
    }
  }

  return [...result];
}

export function getRotationSamplesForReplica(replicaType: ReplicaType): number[] {
  const slotRotations = getFireSelectorLayout(replicaType).slots.map((slot) => slot.rotationDeg);
  return buildRotationSamples(slotRotations);
}

function strokePaddingPx(
  config: FireSelectorReplicaConfig,
  graphicWidth: number,
  graphicHeight: number,
): number {
  const strokeY = (config.viewBoxStrokeWidth / config.viewBoxHeight) * graphicHeight;
  const strokeX = (config.viewBoxStrokeWidth / config.viewBoxWidth) * graphicWidth;
  return Math.max(strokeX, strokeY);
}

function layoutPaddingPx(
  containerWidth: number,
  containerHeight: number,
  insetRatio: number,
): number {
  if (insetRatio <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return 0;
  }
  return Math.max(
    MIN_LAYOUT_INSET_PX,
    Math.round(Math.min(containerWidth, containerHeight) * insetRatio),
  );
}

/**
 * Union of axis-aligned bounds of the viewBox rectangle at `scale`, rotated about `pivot`
 * at every `rotationSamples` angle. Graphic dimensions are fixed; container is the max AABB.
 *
 * Always pass the replica pivot from `getFireSelectorPivot` — never `CENTER_PIVOT`.
 * Rendering uses the same pivot via `pivotTransformInContainer`.
 */
export function computeSweptLayout({
  aspect,
  pivot,
  rotationSamples,
  scale,
  replicaConfig,
}: {
  aspect: number;
  pivot: FireSelectorPivot;
  rotationSamples: number[];
  scale: number;
  replicaConfig?: FireSelectorReplicaConfig;
}): SweptLayoutResult {
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

  return {
    graphicWidth,
    graphicHeight,
    containerWidth,
    containerHeight,
  };
}

/** Swept layout container size at {@link REFERENCE_GRAPHIC_SCALE} (all sampled rotations). */
export function getDefaultSweptBounds(
  replicaType: ReplicaType,
  pivot: FireSelectorPivot,
  aspect: number,
): Pick<SweptLayoutResult, 'containerWidth' | 'containerHeight'> {
  const { containerWidth, containerHeight } = computeSweptLayoutForReplica(
    replicaType,
    REFERENCE_GRAPHIC_SCALE,
    pivot,
    aspect,
  );
  return { containerWidth, containerHeight };
}

/**
 * Scale the selector so the longest side of its swept bounding box fits in the parent box,
 * then clamp so both container width and height fit `maxWidth` × `maxHeight`.
 */
export function scaleToFitMaxBox({
  replicaType,
  aspect,
  pivot,
  maxWidth,
  maxHeight,
}: {
  replicaType: ReplicaType;
  aspect: number;
  pivot: FireSelectorPivot;
  maxWidth: number;
  maxHeight: number;
}): number {
  if (maxWidth <= 0 || maxHeight <= 0) {
    return 0;
  }

  const { containerWidth, containerHeight } = getDefaultSweptBounds(replicaType, pivot, aspect);
  const selectorMaxAxis = Math.max(containerWidth, containerHeight);
  if (selectorMaxAxis <= 0) {
    return 0;
  }

  const boxLimit = Math.min(maxWidth, maxHeight);
  let scale = (boxLimit / selectorMaxAxis) * REFERENCE_GRAPHIC_SCALE;

  for (let pass = 0; pass < 4; pass++) {
    const layout = computeSweptLayoutForReplica(replicaType, scale, pivot, aspect);
    if (layout.containerWidth <= maxWidth && layout.containerHeight <= maxHeight) {
      return scale;
    }
    const scaleW = (maxWidth / layout.containerWidth) * scale;
    const scaleH = (maxHeight / layout.containerHeight) * scale;
    scale = Math.min(scale, scaleW, scaleH);
  }

  return scale > 0 ? scale : 0;
}

/** Largest `scale` so the swept container fits in `maxWidth` × `maxHeight`. */
export function maxScaleForContainer({
  aspect,
  pivot,
  rotationSamples,
  maxWidth,
  maxHeight,
  replicaConfig,
}: {
  aspect: number;
  pivot: FireSelectorPivot;
  rotationSamples: number[];
  maxWidth: number;
  maxHeight: number;
  replicaConfig?: FireSelectorReplicaConfig;
}): number {
  if (maxWidth <= 0 || maxHeight <= 0 || rotationSamples.length === 0) {
    return 0;
  }

  const fits = (scale: number): boolean => {
    const { containerWidth, containerHeight } = computeSweptLayout({
      aspect,
      pivot,
      rotationSamples,
      scale,
      replicaConfig,
    });
    return containerWidth <= maxWidth && containerHeight <= maxHeight;
  };

  let lo = 1;
  let hi = Math.max(maxWidth, maxHeight) * 2;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(mid)) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return fits(lo) ? lo : 0;
}

export function computeSweptLayoutForReplica(
  replicaType: ReplicaType,
  scale: number,
  pivot: FireSelectorPivot,
  aspect: number,
): SweptLayoutResult {
  return computeSweptLayout({
    aspect,
    pivot,
    rotationSamples: getRotationSamplesForReplica(replicaType),
    scale,
    replicaConfig: getFireSelectorReplicaConfig(replicaType),
  });
}

export function maxScaleForReplica({
  replicaType,
  aspect,
  pivot,
  maxWidth,
  maxHeight,
}: {
  replicaType: ReplicaType;
  aspect: number;
  pivot: FireSelectorPivot;
  maxWidth: number;
  maxHeight: number;
}): number {
  return scaleToFitMaxBox({ replicaType, aspect, pivot, maxWidth, maxHeight });
}
