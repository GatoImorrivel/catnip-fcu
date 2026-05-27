import {
  FireModeConfigTypeUnit,
  type FireModeConfigFields,
  type FireModeName,
} from '@/messages/types';

const BASE_BURST_FIELDS: FireModeConfigFields = [
  {
    burst_count: {
      tag: 'Numeric',
      display_name: 'Burst count',
      min: 2,
      max: 10,
      default: 3,
      unit: FireModeConfigTypeUnit.Number,
    },
  },
  {
    burst_delay_ms: {
      tag: 'Numeric',
      display_name: 'Burst delay',
      min: 50,
      max: 500,
      default: 100,
      unit: FireModeConfigTypeUnit.Milliseconds,
    },
  },
];

const BASE_AUTO_FIELDS: FireModeConfigFields = [
  {
    dwell_ms: {
      tag: 'Numeric',
      display_name: 'Dwell time',
      min: 5,
      max: 200,
      default: 14,
      unit: FireModeConfigTypeUnit.Milliseconds,
    },
  },
  {
    require_reset: {
      tag: 'Boolean',
      display_name: 'Require reset',
      default: false,
    },
  },
];

const SCHEMA_BY_MODE: Record<string, FireModeConfigFields> = {
  Safe: [],
  SemiAuto: BASE_AUTO_FIELDS,
  FullAuto: BASE_AUTO_FIELDS,
  Burst: BASE_BURST_FIELDS,
};

export const MOCK_SUPPORTED_FIRE_MODES: FireModeName[] = [
  'Safe',
  'SemiAuto',
  'Burst',
  'FullAuto',
];

export function getMockFireModeSchema(firemodeName: FireModeName): FireModeConfigFields {
  return SCHEMA_BY_MODE[firemodeName] ?? BASE_AUTO_FIELDS;
}
