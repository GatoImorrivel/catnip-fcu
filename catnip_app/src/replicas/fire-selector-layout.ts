import type { ReplicaType } from './types';
import type { WeaponMetadataValues } from './weapon-metadata';

export type FireSelectorSlotId = string;

export type FireSelectorSlot = {
  id: FireSelectorSlotId;
  label: string;
  rotationDeg: number;
};

export type FireSelectorLayout = {
  type: ReplicaType;
  slots: FireSelectorSlot[];
};

const M4_SLOTS: FireSelectorSlot[] = [
  { id: 'north', label: 'North', rotationDeg: 0 },
  { id: 'south', label: 'South', rotationDeg: 180 },
  { id: 'west', label: 'West', rotationDeg: 270 },
  { id: 'east', label: 'East', rotationDeg: 90 },
];

const AK_SLOTS: FireSelectorSlot[] = [
  { id: 'pos1', label: 'Position 1', rotationDeg: 0 },
  { id: 'pos2', label: 'Position 2', rotationDeg: 12 },
  { id: 'pos3', label: 'Position 3', rotationDeg: 21 },
];

const LAYOUTS: Record<ReplicaType, FireSelectorLayout> = {
  M4: { type: 'M4', slots: M4_SLOTS },
  AK: { type: 'AK', slots: AK_SLOTS },
};

export function getFireSelectorLayout(type: ReplicaType): FireSelectorLayout {
  return LAYOUTS[type];
}

export function getGunVisualSlotCount(type: ReplicaType): number {
  return getFireSelectorLayout(type).slots.length;
}

export function getWeaponActivePositions(
  type: ReplicaType,
  metadata: WeaponMetadataValues,
): number {
  if (type === 'AK') {
    return 3;
  }

  return metadata.fireSelectorPositions ?? 4;
}

export function getRequiredMappingCount(
  type: ReplicaType,
  metadata: WeaponMetadataValues,
  fcuNumPositions: number,
): number {
  const weaponActive = getWeaponActivePositions(type, metadata);
  return Math.min(weaponActive, fcuNumPositions);
}

export function needsGunSlotSelection(
  type: ReplicaType,
  metadata: WeaponMetadataValues,
  fcuNumPositions: number,
): boolean {
  const gunVisualSlots = getGunVisualSlotCount(type);
  const required = getRequiredMappingCount(type, metadata, fcuNumPositions);
  return gunVisualSlots > required;
}

export function getSlotById(
  type: ReplicaType,
  slotId: FireSelectorSlotId,
): FireSelectorSlot | undefined {
  return getFireSelectorLayout(type).slots.find((slot) => slot.id === slotId);
}

export function getSlotsForMapping(
  type: ReplicaType,
  selectedGunSlotIds: FireSelectorSlotId[],
  metadata: WeaponMetadataValues,
  fcuNumPositions: number,
): FireSelectorSlot[] {
  const layout = getFireSelectorLayout(type);

  if (needsGunSlotSelection(type, metadata, fcuNumPositions)) {
    return selectedGunSlotIds
      .map((id) => getSlotById(type, id))
      .filter((slot): slot is FireSelectorSlot => slot !== undefined);
  }

  return layout.slots;
}
