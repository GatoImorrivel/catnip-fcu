/** Wire name for a fire mode (e.g. `"Safe"`, `"FullAuto"`). */
export type FireModeName = string;

/** Mirrors `catnip_core::FCUKind`. */
export type FCUKind =
  | { tag: 'HPA'; num_solenoids: number }
  | { tag: 'AEG' };

/** Mirrors `catnip_core::Characteristics`. */
export type Characteristics = {
  num_fire_positions: number;
  name: string;
  kind: FCUKind;
};

/** Mirrors `catnip_core::FireModeConfigTypeUnit`. */
export enum FireModeConfigTypeUnit {
  Milliseconds = 0,
  Seconds = 1,
  Minutes = 2,
  Number = 3,
  Boolean = 4,
}

/** Schema entry for an `i32` config field (from `GetFireModeConfigFields`). */
export type FireModeConfigSchemaNumeric = {
  tag: 'Numeric';
  display_name: string;
  min: number;
  max: number;
  default: number;
  unit: FireModeConfigTypeUnit;
};

/** Schema entry for a `bool` config field. */
export type FireModeConfigSchemaBoolean = {
  tag: 'Boolean';
  display_name: string;
  default: boolean;
};

export type FireModeConfigSchemaEntry =
  | FireModeConfigSchemaNumeric
  | FireModeConfigSchemaBoolean;

/** One map per field; key is the wire field name (`dwell_ms`, etc.). */
export type FireModeConfigField = Record<string, FireModeConfigSchemaEntry>;

/** Mirrors `catnip_core::firemode::FireModeConfigFields`. */
export type FireModeConfigFields = FireModeConfigField[];

/** Stored config for a selector position (`GetFireModeForPosition`). */
export type FireModePositionConfig = {
  firemode_name: FireModeName;
  config: Record<string, string>;
};

/** Mirrors `catnip_core::UpdateFireModeConfigError`. */
export enum UpdateFireModeConfigError {
  InvalidConfig = 0,
  UnsupportedFireMode = 1,
}

/** Mirrors `catnip_core::FCUToHostEvent`. */
export type FCUToHostEvent =
  | { tag: 'SelectorPositionChange'; position: number }
  | { tag: 'FireModeChange'; firemode_name: FireModeName }
  | { tag: 'TriggerPull' };

export const HOST_TO_FCU_REQUEST_VARIANT = {
  GetCharacteristcs: 0,
  GetCurrentFireSelectorPosition: 1,
  GetFireModeForPosition: 2,
  GetSupportedFireModes: 3,
  GetFireModeConfigFields: 4,
  UpdateFireModeConfig: 5,
} as const;

export type HostToFcuRequestVariant = keyof typeof HOST_TO_FCU_REQUEST_VARIANT;

/** @deprecated Use `OUTBOUND_TAG_REPLY` / `OUTBOUND_TAG_EVENT` from `./codec`. */
export const OUTBOUND_TAG = {
  Reply: 1,
  Event: 2,
} as const;

/** UI labels for known fire mode wire names. */
export const FIRE_MODE_LABELS: Record<string, string> = {
  Safe: 'Safe',
  FullAuto: 'Full auto',
  SemiAuto: 'Semi auto',
  Burst: 'Burst',
};

export function formatFireModeName(name: FireModeName): string {
  return FIRE_MODE_LABELS[name] ?? name;
}

/** Merge stored position values into a schema for edit UI. */
export function mergeSchemaWithValues(
  schema: FireModeConfigFields,
  values: Record<string, string>,
): FireModeConfigFields {
  return schema.map((fieldGroup) => {
    const merged: FireModeConfigField = {};
    for (const [key, entry] of Object.entries(fieldGroup)) {
      const raw = values[key];
      if (raw === undefined) {
        merged[key] = entry;
        continue;
      }
      if (entry.tag === 'Numeric') {
        const parsed = Number.parseInt(raw, 10);
        merged[key] = {
          ...entry,
          default: Number.isNaN(parsed) ? entry.default : parsed,
        };
      } else {
        merged[key] = {
          ...entry,
          default: raw === 'true',
        };
      }
    }
    return merged;
  });
}
