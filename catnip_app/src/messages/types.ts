/** Mirrors `catnip_core::FireMode`. */
export enum FireMode {
  Safe = 0,
  FullAuto = 1,
  SemiAuto = 2,
  Burst = 3,
}

/** Mirrors `catnip_core::FCUKind`. */
export type FCUKind =
  | { tag: 'HPA'; num_solenoids: number }
  | { tag: 'AEG' };

/** Mirrors `catnip_core::Characteristics`. */
export type Characteristics = {
  num_fire_positions: number;
  supported_firemodes: FireMode[];
  name: string;
  kind: FCUKind;
};

/** Mirrors `catnip_core::FireModeConfigTypeUnit`. */
export enum FireModeConfigTypeUnit {
  Milliseconds = 0,
  Seconds = 1,
  Minutes = 2,
  Number = 3,
}

/** Mirrors `catnip_core::FireModeConfigType`. */
export type FireModeConfigType = {
  tag: 'Numeric';
  min: number;
  max: number;
  current: number;
  default: number | null;
  unit: FireModeConfigTypeUnit;
};

/** Mirrors `catnip_core::FireModeConfigField`. */
export type FireModeConfigField = Record<string, FireModeConfigType>;

/** Mirrors `catnip_core::FireModeConfigFields`. */
export type FireModeConfigFields = FireModeConfigField[];

/** Mirrors `catnip_messages::UpdateFireModeConfigError`. */
export enum UpdateFireModeConfigError {
  InvalidConfig = 0,
  UnsupportedFireMode = 1,
}

/** Mirrors `catnip_messages::FCUToHostEvent`. */
export type FCUToHostEvent =
  | { tag: 'FireModeChange'; firemode: FireMode }
  | { tag: 'TriggerPull' };

export const HOST_TO_FCU_REQUEST_VARIANT = {
  GetCharacteristcs: 0,
  GetFireModeConfig: 1,
  GetCurrentFireMode: 2,
  UpdateFireModeConfig: 3,
} as const;

export type HostToFcuRequestVariant = keyof typeof HOST_TO_FCU_REQUEST_VARIANT;

/** @deprecated Use `OUTBOUND_TAG_REPLY` / `OUTBOUND_TAG_EVENT` from `./codec`. */
export const OUTBOUND_TAG = {
  Reply: 1,
  Event: 2,
} as const;
