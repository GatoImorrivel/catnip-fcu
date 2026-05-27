import type { FcuProfileId, SelectorPositionProfileAssignment } from './types';

export function parseSelectorPositionProfiles(
  replica: Record<string, unknown>,
): SelectorPositionProfileAssignment[] {
  const raw = replica.selectorPositionProfiles;
  if (!Array.isArray(raw)) {
    return [];
  }

  const result: SelectorPositionProfileAssignment[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.fcuPosition === 'number' &&
      Number.isInteger(record.fcuPosition) &&
      record.fcuPosition >= 0 &&
      typeof record.profileId === 'string' &&
      record.profileId.length > 0
    ) {
      result.push({
        fcuPosition: record.fcuPosition,
        profileId: record.profileId as FcuProfileId,
      });
    }
  }
  return result;
}

export function upsertPositionProfileAssignment(
  assignments: SelectorPositionProfileAssignment[],
  fcuPosition: number,
  profileId: FcuProfileId,
): SelectorPositionProfileAssignment[] {
  const without = assignments.filter((entry) => entry.fcuPosition !== fcuPosition);
  return [...without, { fcuPosition, profileId }];
}

export function profileIdForPosition(
  assignments: SelectorPositionProfileAssignment[],
  fcuPosition: number,
): FcuProfileId | null {
  return assignments.find((entry) => entry.fcuPosition === fcuPosition)?.profileId ?? null;
}
