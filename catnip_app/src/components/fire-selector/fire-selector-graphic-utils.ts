import {
  boundsAfterRotationAroundPivot,
  type FireSelectorPivot,
} from '@/replicas/fire-selector-pivot-math';

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

/**
 * Scales an unrotated graphic (width × height) so its rotated bounding box fits in `maxSize`.
 */
export function fitGraphicInSquare(
  aspect: number,
  rotationDeg: number,
  maxSize: number,
  pivot: FireSelectorPivot,
): {
  graphicWidth: number;
  graphicHeight: number;
  containerWidth: number;
  containerHeight: number;
} {
  const unrotatedHeight = maxSize;
  const unrotatedWidth = maxSize * aspect;
  const bounds = boundsAfterRotationAroundPivot(
    unrotatedWidth,
    unrotatedHeight,
    pivot,
    rotationDeg,
  );
  const scale = maxSize / Math.max(bounds.width, bounds.height);
  const graphicWidth = unrotatedWidth * scale;
  const graphicHeight = unrotatedHeight * scale;
  const fittedBounds = boundsAfterRotationAroundPivot(
    graphicWidth,
    graphicHeight,
    pivot,
    rotationDeg,
  );

  return {
    graphicWidth,
    graphicHeight,
    containerWidth: fittedBounds.width,
    containerHeight: fittedBounds.height,
  };
}
