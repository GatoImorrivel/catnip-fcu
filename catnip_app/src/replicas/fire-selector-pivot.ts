import pivotsJson from './fire-selector-pivots.json';
import type { FireSelectorPivot } from './fire-selector-pivot-math';
import { CENTER_PIVOT } from './fire-selector-pivot-math';
import { REPLICA_TYPES, type ReplicaType } from './types';

export type { FireSelectorPivot } from './fire-selector-pivot-math';
export { CENTER_PIVOT } from './fire-selector-pivot-math';

const pivots = pivotsJson as Record<string, FireSelectorPivot>;

function isFireSelectorPivot(value: unknown): value is FireSelectorPivot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.x === 'number' && typeof record.y === 'number';
}

export function getFireSelectorPivot(type: ReplicaType): FireSelectorPivot {
  const pivot = pivots[type];
  if (isFireSelectorPivot(pivot)) {
    return pivot;
  }
  return CENTER_PIVOT;
}

/** Weapon styles that have pivot entries in the committed JSON. */
export function getConfiguredFireSelectorTypes(): ReplicaType[] {
  return REPLICA_TYPES.filter((type) => isFireSelectorPivot(pivots[type]));
}
