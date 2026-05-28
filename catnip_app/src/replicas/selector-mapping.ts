import {
  getRequiredMappingCount,
  getSlotById,
  type FireSelectorSlotId,
} from './fire-selector-layout';
import type { ReplicaType } from './types';
import type { WeaponMetadataValues } from './weapon-metadata';

export type SelectorPositionMappingEntry = {
  uiSlotId: FireSelectorSlotId;
  fcuPosition: number;
};

export function isGunSlotSelectionComplete(
  selectedGunSlotIds: FireSelectorSlotId[],
  requiredCount: number,
): boolean {
  return selectedGunSlotIds.length === requiredCount;
}

export function hasDuplicateFcuPositions(mapping: SelectorPositionMappingEntry[]): boolean {
  const seen = new Set<number>();
  for (const entry of mapping) {
    if (seen.has(entry.fcuPosition)) {
      return true;
    }
    seen.add(entry.fcuPosition);
  }
  return false;
}

export function isMappingComplete(
  type: ReplicaType,
  metadata: WeaponMetadataValues,
  fcuNumPositions: number,
  mapping: SelectorPositionMappingEntry[],
): boolean {
  const required = getRequiredMappingCount(type, metadata, fcuNumPositions);
  if (mapping.length !== required) {
    return false;
  }
  if (hasDuplicateFcuPositions(mapping)) {
    return false;
  }
  return mapping.every(
    (entry) =>
      typeof entry.uiSlotId === 'string' &&
      entry.uiSlotId.length > 0 &&
      Number.isInteger(entry.fcuPosition) &&
      entry.fcuPosition >= 0,
  );
}

export function getMappingEntryForSlot(
  mapping: SelectorPositionMappingEntry[],
  uiSlotId: FireSelectorSlotId,
): SelectorPositionMappingEntry | undefined {
  return mapping.find((entry) => entry.uiSlotId === uiSlotId);
}

export function upsertMappingEntry(
  mapping: SelectorPositionMappingEntry[],
  entry: SelectorPositionMappingEntry,
): SelectorPositionMappingEntry[] {
  const without = mapping.filter((item) => item.uiSlotId !== entry.uiSlotId);
  return [...without, entry];
}

/** Assigns the live FCU position to a UI slot, removing any other slot that had claimed it. */
export function assignFcuPositionToSlot(
  mapping: SelectorPositionMappingEntry[],
  uiSlotId: FireSelectorSlotId,
  fcuPosition: number,
): SelectorPositionMappingEntry[] {
  const withoutOtherClaimants = mapping.filter(
    (item) => item.fcuPosition !== fcuPosition || item.uiSlotId === uiSlotId,
  );
  return upsertMappingEntry(withoutOtherClaimants, { uiSlotId, fcuPosition });
}

export function lookupUiSlotForFcuPosition(
  mapping: SelectorPositionMappingEntry[],
  fcuPosition: number,
): SelectorPositionMappingEntry | undefined {
  return mapping.find((entry) => entry.fcuPosition === fcuPosition);
}

export function rotationDegForFcuPosition(
  type: ReplicaType,
  mapping: SelectorPositionMappingEntry[],
  fcuPosition: number,
): number | null {
  const entry = lookupUiSlotForFcuPosition(mapping, fcuPosition);
  if (!entry) {
    return null;
  }

  const slot = getSlotById(type, entry.uiSlotId);
  return slot?.rotationDeg ?? null;
}

export function slotLabelForFcuPosition(
  type: ReplicaType,
  mapping: SelectorPositionMappingEntry[],
  fcuPosition: number,
): string | null {
  const entry = lookupUiSlotForFcuPosition(mapping, fcuPosition);
  if (!entry) {
    return null;
  }

  const slot = getSlotById(type, entry.uiSlotId);
  return slot?.label ?? null;
}

function isValidMappingEntry(value: unknown): value is SelectorPositionMappingEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.uiSlotId === 'string' &&
    entry.uiSlotId.length > 0 &&
    typeof entry.fcuPosition === 'number' &&
    Number.isInteger(entry.fcuPosition) &&
    entry.fcuPosition >= 0
  );
}

export function parseSelectorPositionMapping(
  replica: Record<string, unknown>,
): SelectorPositionMappingEntry[] {
  const raw = replica.selectorPositionMapping;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isValidMappingEntry);
}
