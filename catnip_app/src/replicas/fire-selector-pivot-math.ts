export type FireSelectorPivot = {
  /** 0–1 horizontal, relative to graphic width (SVG viewBox). */
  x: number;
  /** 0–1 vertical, relative to graphic height (SVG viewBox). */
  y: number;
};

export const CENTER_PIVOT: FireSelectorPivot = { x: 0.5, y: 0.5 };

export function pivotToPixel(
  pivot: FireSelectorPivot,
  width: number,
  height: number,
): { px: number; py: number } {
  return {
    px: pivot.x * width,
    py: pivot.y * height,
  };
}

/** Pivot rotation offsets when the graphic is centered inside a larger layout container. */
export function pivotTransformInContainer(
  pivot: FireSelectorPivot,
  graphicWidth: number,
  graphicHeight: number,
  containerWidth: number,
  containerHeight: number,
): { tx: number; ty: number; graphicLeft: number; graphicTop: number } {
  const { px, py } = pivotToPixel(pivot, graphicWidth, graphicHeight);
  const graphicLeft = (containerWidth - graphicWidth) / 2;
  const graphicTop = (containerHeight - graphicHeight) / 2;
  const pivotX = graphicLeft + px;
  const pivotY = graphicTop + py;

  return {
    tx: pivotX - containerWidth / 2,
    ty: pivotY - containerHeight / 2,
    graphicLeft,
    graphicTop,
  };
}

function rotatePoint(
  x: number,
  y: number,
  pivotX: number,
  pivotY: number,
  cos: number,
  sin: number,
): { x: number; y: number } {
  const dx = x - pivotX;
  const dy = y - pivotY;
  return {
    x: pivotX + dx * cos - dy * sin,
    y: pivotY + dx * sin + dy * cos,
  };
}

/** Axis-aligned bounds of a width×height rectangle rotated about `pivot` (graphic-local coords). */
export function rotatedAabbAroundPivot(
  width: number,
  height: number,
  pivot: FireSelectorPivot,
  rotationDeg: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const { px, py } = pivotToPixel(pivot, width, height);
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const corner of corners) {
    const rotated = rotatePoint(corner.x, corner.y, px, py, cos, sin);
    minX = Math.min(minX, rotated.x);
    minY = Math.min(minY, rotated.y);
    maxX = Math.max(maxX, rotated.x);
    maxY = Math.max(maxY, rotated.y);
  }

  return { minX, minY, maxX, maxY };
}

/** Axis-aligned bounds of a width×height rectangle rotated about `pivot`. */
export function boundsAfterRotationAroundPivot(
  width: number,
  height: number,
  pivot: FireSelectorPivot,
  rotationDeg: number,
): { width: number; height: number } {
  const { minX, minY, maxX, maxY } = rotatedAabbAroundPivot(
    width,
    height,
    pivot,
    rotationDeg,
  );

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Positions the graphic so its pivot-rotated AABB is centered in the container.
 * Use with `rnTransformAroundPivot` on an inner view sized to the graphic.
 */
export function graphicOffsetForPivotRotation(
  graphicWidth: number,
  graphicHeight: number,
  pivot: FireSelectorPivot,
  rotationDeg: number,
  containerWidth: number,
  containerHeight: number,
): { graphicLeft: number; graphicTop: number } {
  const { minX, minY, maxX, maxY } = rotatedAabbAroundPivot(
    graphicWidth,
    graphicHeight,
    pivot,
    rotationDeg,
  );
  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;

  return {
    graphicLeft: (containerWidth - boundsWidth) / 2 - minX,
    graphicTop: (containerHeight - boundsHeight) / 2 - minY,
  };
}

/** React Native Reanimated / Animated transform steps. */
export function rnTransformAroundPivot(
  rotationDeg: number,
  pivot: FireSelectorPivot,
  graphicWidth: number,
  graphicHeight: number,
): Array<{ translateX: number } | { translateY: number } | { rotate: string }> {
  const { px, py } = pivotToPixel(pivot, graphicWidth, graphicHeight);
  const tx = px - graphicWidth / 2;
  const ty = py - graphicHeight / 2;

  return [
    { translateX: tx },
    { translateY: ty },
    { rotate: `${rotationDeg}deg` },
    { translateX: -tx },
    { translateY: -ty },
  ];
}

/** CSS transform for the web pivot editor. */
export function cssTransformAroundPivot(
  rotationDeg: number,
  pivot: FireSelectorPivot,
  graphicWidth: number,
  graphicHeight: number,
): string {
  const { px, py } = pivotToPixel(pivot, graphicWidth, graphicHeight);
  const tx = px - graphicWidth / 2;
  const ty = py - graphicHeight / 2;

  return `translate(${tx}px, ${ty}px) rotate(${rotationDeg}deg) translate(${-tx}px, ${-ty}px)`;
}
