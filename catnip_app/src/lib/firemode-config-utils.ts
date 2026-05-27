import {
  FireModeConfigTypeUnit,
  type FireModeConfigFields,
  type FireModeConfigSchemaEntry,
} from '@/messages/types';

export type FlattenedSchemaField = {
  key: string;
  entry: FireModeConfigSchemaEntry;
};

export function flattenSchemaFields(schema: FireModeConfigFields): FlattenedSchemaField[] {
  const fields: FlattenedSchemaField[] = [];
  for (const fieldGroup of schema) {
    for (const [key, entry] of Object.entries(fieldGroup)) {
      fields.push({ key, entry });
    }
  }
  return fields;
}

export function formatConfigUnit(unit: FireModeConfigTypeUnit): string {
  switch (unit) {
    case FireModeConfigTypeUnit.Milliseconds:
      return 'ms';
    case FireModeConfigTypeUnit.Seconds:
      return 's';
    case FireModeConfigTypeUnit.Minutes:
      return 'min';
    case FireModeConfigTypeUnit.Number:
    case FireModeConfigTypeUnit.Boolean:
    default:
      return '';
  }
}

export function defaultWireValuesFromSchema(
  schema: FireModeConfigFields,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const { key, entry } of flattenSchemaFields(schema)) {
    if (entry.tag === 'Numeric') {
      const fallback = entry.default ?? entry.min;
      values[key] = String(fallback);
    } else {
      values[key] = entry.default === true ? 'true' : 'false';
    }
  }
  return values;
}

/**
 * Builds a wire config map valid for `UpdateFireModeConfig`: FCU schema defaults
 * plus profile overrides for known fields only (extras like mock-only keys are dropped).
 */
export function buildWireConfigForFcu(
  schema: FireModeConfigFields,
  profileOverrides: Record<string, string>,
): Record<string, string> {
  const result = defaultWireValuesFromSchema(schema);

  for (const { key, entry } of flattenSchemaFields(schema)) {
    const override = profileOverrides[key];
    if (override === undefined) {
      continue;
    }

    if (entry.tag === 'Numeric') {
      result[key] = clampNumericWireValue(override, entry.min, entry.max);
    } else {
      result[key] = override === 'true' ? 'true' : 'false';
    }
  }

  return result;
}

export function clampNumericWireValue(raw: string, min: number, max: number): string {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return String(min);
  }
  return String(Math.min(max, Math.max(min, parsed)));
}
