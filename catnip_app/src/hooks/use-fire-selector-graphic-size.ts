import { useMemo } from 'react';

import { scaleToFitMaxBox } from '@/replicas/fire-selector-sweep';
import { getFireSelectorAspect } from '@/replicas/fire-selector-replica-config';
import { getFireSelectorPivot } from '@/replicas/fire-selector-pivot';
import type { ReplicaType } from '@/replicas/types';

export type UseFireSelectorGraphicSizeParams = {
  replicaType: ReplicaType;
  /** Maximum width (px) available for the swept selector bounding box. */
  maxWidth: number;
  /** Maximum height (px) available for the swept selector bounding box. */
  maxHeight: number;
  /** Hint, captions, and other non-graphic vertical space to subtract from `maxHeight`. */
  chromeHeight?: number;
};

/** Graphic height (scale) so the selector's swept bounds fit in the given max box. */
export function useFireSelectorGraphicSize({
  replicaType,
  maxWidth,
  maxHeight,
  chromeHeight = 0,
}: UseFireSelectorGraphicSizeParams): number {
  return useMemo(() => {
    const boundsMaxHeight = maxHeight - chromeHeight;
    if (maxWidth <= 0 || boundsMaxHeight <= 0) {
      return 0;
    }

    const aspect = getFireSelectorAspect(replicaType);
    const pivot = getFireSelectorPivot(replicaType);
    return scaleToFitMaxBox({
      replicaType,
      aspect,
      pivot,
      maxWidth,
      maxHeight: boundsMaxHeight,
    });
  }, [chromeHeight, maxHeight, maxWidth, replicaType]);
}
