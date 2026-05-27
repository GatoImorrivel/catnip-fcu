/**
 * Re-exports shared pivot math and mirrors app `fitGraphicInSquare` for the web preview.
 */
export {
  boundsAfterRotationAroundPivot,
  cssTransformAroundPivot,
  pivotToPixel,
  type FireSelectorPivot,
} from '@catnip/pivot-math';

import { boundsAfterRotationAroundPivot, type FireSelectorPivot } from '@catnip/pivot-math';

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

/**
 * Fixed graphic size (from 0° fit) and container large enough for every `rotationAngles`.
 * Avoids resize/pulsing when stepping between discrete positions.
 */
export function fitGraphicFixedEnvelope(
  aspect: number,
  maxSize: number,
  pivot: FireSelectorPivot,
  rotationAngles: number[],
): {
  graphicWidth: number;
  graphicHeight: number;
  containerWidth: number;
  containerHeight: number;
  graphicOffsetX: number;
  graphicOffsetY: number;
} {
  const base = fitGraphicInSquare(aspect, 0, maxSize, pivot);

  let containerWidth = base.containerWidth;
  let containerHeight = base.containerHeight;

  for (const rotationDeg of rotationAngles) {
    const bounds = boundsAfterRotationAroundPivot(
      base.graphicWidth,
      base.graphicHeight,
      pivot,
      rotationDeg,
    );
    containerWidth = Math.max(containerWidth, bounds.width);
    containerHeight = Math.max(containerHeight, bounds.height);
  }

  return {
    graphicWidth: base.graphicWidth,
    graphicHeight: base.graphicHeight,
    containerWidth,
    containerHeight,
    graphicOffsetX: (containerWidth - base.graphicWidth) / 2,
    graphicOffsetY: (containerHeight - base.graphicHeight) / 2,
  };
}
