import {
  buildRotationSamples,
  computeSweptLayout,
  computeSweptLayoutForReplica,
  getRotationSamplesForReplica,
  maxScaleForContainer,
  scaleToFitMaxBox,
} from '@/replicas/fire-selector-sweep';
import {
  getFireSelectorAspect,
  getFireSelectorReplicaConfig,
  type FireSelectorReplicaConfig,
} from '@/replicas/fire-selector-replica-config';
import {
  boundsAfterRotationAroundPivot,
  type FireSelectorPivot,
} from '@/replicas/fire-selector-pivot-math';
import type { ReplicaType } from '@/replicas/types';

/** Degrees to add to `fromDeg` for the shortest animated turn to `toDeg`. */
export function shortestRotationDelta(fromDeg: number, toDeg: number): number {
  const delta = ((toDeg - fromDeg) % 360 + 540) % 360 - 180;
  return delta;
}

/** Bounding box of a rectangle after rotation about its center (degrees). */
export function rotatedBounds(
  width: number,
  height: number,
  rotationDeg: number,
): { width: number; height: number } {
  return boundsAfterRotationAroundPivot(width, height, { x: 0.5, y: 0.5 }, rotationDeg);
}

export { getRotationSamplesForReplica, buildRotationSamples };

/** Max container overflow (px) when the graphic is rotated inside the swept container. */
export function graphicContainerOverflow(
  graphicWidth: number,
  graphicHeight: number,
  containerWidth: number,
  containerHeight: number,
  pivot: FireSelectorPivot,
  rotations: number[],
): { maxOverflowW: number; maxOverflowH: number; worstRotationDeg: number | null } {
  let maxOverflowW = 0;
  let maxOverflowH = 0;
  let worstRotationDeg: number | null = null;

  for (const rotationDeg of rotations) {
    const bounds = boundsAfterRotationAroundPivot(
      graphicWidth,
      graphicHeight,
      pivot,
      rotationDeg,
    );
    const overflowW = bounds.width - containerWidth;
    const overflowH = bounds.height - containerHeight;
    if (overflowW > maxOverflowW || overflowH > maxOverflowH) {
      maxOverflowW = Math.max(maxOverflowW, overflowW);
      maxOverflowH = Math.max(maxOverflowH, overflowH);
      worstRotationDeg = rotationDeg;
    }
  }

  return { maxOverflowW, maxOverflowH, worstRotationDeg };
}

/**
 * Single-angle layout for static tiles: largest scale so the pivot-rotated bounds
 * (plus replica padding) fit in a square `maxSize` box.
 */
export function fitGraphicAtRotation(
  replicaType: ReplicaType,
  rotationDeg: number,
  maxSize: number,
  pivot: FireSelectorPivot,
): {
  graphicWidth: number;
  graphicHeight: number;
  containerWidth: number;
  containerHeight: number;
} {
  const aspect = getFireSelectorAspect(replicaType);
  const replicaConfig = getFireSelectorReplicaConfig(replicaType);
  const rotationSamples = [((rotationDeg % 360) + 360) % 360];
  const scale = scaleToFitMaxBox({
    replicaType,
    aspect,
    pivot,
    maxWidth: maxSize,
    maxHeight: maxSize,
  });

  return computeSweptLayout({
    aspect,
    pivot,
    rotationSamples,
    scale,
    replicaConfig,
  });
}

/**
 * Swept layout at a fixed graphic scale (`maxSize` = graphic height).
 * Container is the union of pivot-rotated bounds at every layout sample rotation.
 */
export function fitGraphicForReplica(
  replicaType: ReplicaType,
  aspect: number,
  maxSize: number,
  pivot: FireSelectorPivot,
): {
  graphicWidth: number;
  graphicHeight: number;
  containerWidth: number;
  containerHeight: number;
} {
  return computeSweptLayoutForReplica(replicaType, maxSize, pivot, aspect);
}

export function fitGraphicForWorstRotation(
  aspect: number,
  slotRotations: number[],
  maxSize: number,
  pivot: FireSelectorPivot,
  options?: {
    boundsSampleRotations?: number[];
    replicaConfig?: FireSelectorReplicaConfig;
  },
): ReturnType<typeof fitGraphicForReplica> {
  const rotationSamples =
    options?.boundsSampleRotations ?? buildRotationSamples(slotRotations);

  return computeSweptLayout({
    aspect,
    pivot,
    rotationSamples,
    scale: maxSize,
    replicaConfig: options?.replicaConfig,
  });
}

export function maxGraphicSizeForBox({
  aspect,
  pivot,
  rotations,
  replicaType,
  maxWidth,
  maxHeight,
}: {
  aspect: number;
  pivot: FireSelectorPivot;
  rotations?: number[];
  replicaType?: ReplicaType;
  maxWidth: number;
  maxHeight: number;
}): number {
  if (replicaType) {
    return scaleToFitMaxBox({
      replicaType,
      aspect,
      pivot,
      maxWidth,
      maxHeight,
    });
  }

  const rotationSamples = rotations ? buildRotationSamples(rotations) : [];

  return maxScaleForContainer({
    aspect,
    pivot,
    rotationSamples,
    maxWidth,
    maxHeight,
  });
}
