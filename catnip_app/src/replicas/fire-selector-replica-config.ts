import type { ReplicaType } from './types';

/**
 * Explicit inset on each side of the layout container (fraction of the smaller axis).
 * Use for selectors that benefit from extra margin (e.g. M4); narrow-sweep types often use 0.
 */
export const FIRE_SELECTOR_LAYOUT_INSET_RATIO = 0.08;

export type FireSelectorReplicaConfig = {
  aspect: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  viewBoxStrokeWidth: number;
  layoutInsetRatio: number;
};

const REPLICA_CONFIGS: Record<ReplicaType, FireSelectorReplicaConfig> = {
  M4: {
    aspect: 512 / 1024,
    viewBoxWidth: 512,
    viewBoxHeight: 1024,
    viewBoxStrokeWidth: 12,
    layoutInsetRatio: FIRE_SELECTOR_LAYOUT_INSET_RATIO,
  },
  AK: {
    aspect: 176.67398 / 52.871712,
    viewBoxWidth: 176.67398,
    viewBoxHeight: 52.871712,
    viewBoxStrokeWidth: 12,
    layoutInsetRatio: 0,
  },
};

export function getFireSelectorReplicaConfig(type: ReplicaType): FireSelectorReplicaConfig {
  return REPLICA_CONFIGS[type];
}

export function getFireSelectorAspect(type: ReplicaType): number {
  return getFireSelectorReplicaConfig(type).aspect;
}
