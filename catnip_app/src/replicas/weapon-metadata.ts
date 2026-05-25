import type { ReplicaType } from './types';

/** Per-weapon fields collected during replica creation (persisted on the replica record). */
export type WeaponMetadataValues = {
  fireSelectorPositions?: 3 | 4;
};

export type MetadataChoiceOption<T extends string | number> = {
  value: T;
  label: string;
};

export type MetadataChoiceField<K extends keyof WeaponMetadataValues> = {
  kind: 'choice';
  key: K;
  label: string;
  options: MetadataChoiceOption<NonNullable<WeaponMetadataValues[K]>>[];
};

type WeaponMetadataConfig = {
  [K in ReplicaType]?: MetadataChoiceField<keyof WeaponMetadataValues>[];
};

export const WEAPON_METADATA_FIELDS: WeaponMetadataConfig = {
  M4: [
    {
      kind: 'choice',
      key: 'fireSelectorPositions',
      label: 'How many positions does the fire selector allow?',
      options: [
        { value: 3, label: '3' },
        { value: 4, label: '4' },
      ],
    },
  ],
};

export function getWeaponMetadataFields(
  type: ReplicaType,
): MetadataChoiceField<keyof WeaponMetadataValues>[] {
  return WEAPON_METADATA_FIELDS[type] ?? [];
}

export function hasWeaponMetadata(type: ReplicaType): boolean {
  return getWeaponMetadataFields(type).length > 0;
}

export function isWeaponMetadataComplete(
  type: ReplicaType,
  values: WeaponMetadataValues,
): boolean {
  return getWeaponMetadataFields(type).every((field) => values[field.key] !== undefined);
}
