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
      values[key] = String(entry.default);
    } else {
      values[key] = entry.default === true ? 'true' : 'false';
    }
  }
  return values;
}

const INTEGER_WIRE_VALUE_PATTERN = /^-?\d+$/;

export function isNumericWireValueValid(raw: string, min: number, max: number): boolean {
  if (!INTEGER_WIRE_VALUE_PATTERN.test(raw)) {
    return false;
  }
  const parsed = Number.parseInt(raw, 10);
  return parsed >= min && parsed <= max;
}

export function isWireConfigValid(
  schema: FireModeConfigFields,
  values: Record<string, string>,
): boolean {
  for (const { key, entry } of flattenSchemaFields(schema)) {
    const value = values[key] ?? '';
    if (entry.tag === 'Numeric') {
      if (!isNumericWireValueValid(value, entry.min, entry.max)) {
        return false;
      }
    } else if (value !== 'true' && value !== 'false') {
      return false;
    }
  }
  return true;
}

/** Merges schema defaults with profile overrides without clamping (editor display). */
export function mergeEditorConfigValues(
  schema: FireModeConfigFields,
  overrides: Record<string, string>,
): Record<string, string> {
  const result = defaultWireValuesFromSchema(schema);
  for (const { key } of flattenSchemaFields(schema)) {
    if (overrides[key] !== undefined) {
      result[key] = overrides[key];
    }
  }
  return result;
}

/**
 * Builds a wire config map valid for `UpdateFireModeConfig`: FCU schema defaults
 * plus profile overrides for known fields only (extras like mock-only keys are dropped).
 * Invalid numeric overrides are skipped (default kept).
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
      if (isNumericWireValueValid(override, entry.min, entry.max)) {
        result[key] = String(Number.parseInt(override, 10));
      }
    } else {
      result[key] = override === 'true' ? 'true' : 'false';
    }
  }

  return result;
}

export function wireConfigsEqual(
  schema: FireModeConfigFields,
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  for (const { key } of flattenSchemaFields(schema)) {
    if ((a[key] ?? '') !== (b[key] ?? '')) {
      return false;
    }
  }
  return true;
}

export function clampNumericWireValue(raw: string, min: number, max: number): string {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return String(min);
  }
  return String(Math.min(max, Math.max(min, parsed)));
}
