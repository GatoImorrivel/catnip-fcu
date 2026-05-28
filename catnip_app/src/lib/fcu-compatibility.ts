import type { Characteristics } from '@/messages/types';

export function normalizeCompatibilityId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('FCU returned empty compatibility_id');
  }
  return trimmed;
}

export function assertCharacteristicsCompatibilityId(
  characteristics: Characteristics,
): string {
  return normalizeCompatibilityId(characteristics.compatibility_id);
}
