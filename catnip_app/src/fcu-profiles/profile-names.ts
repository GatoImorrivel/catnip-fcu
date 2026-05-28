import type { FcuProfile, FcuProfileId } from './types';
import { listProfiles } from './mock-store';

export function getProfileDisplayName(profile: FcuProfile): string {
  return profile.name;
}

export function normalizeProfileName(name: string): string {
  return name.trim().toLowerCase();
}

export function validateProfileName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'Enter a profile name';
  }
  if (trimmed.length > 64) {
    return 'Name must be 64 characters or less';
  }
  return null;
}

export function isProfileNameTaken(
  compatibilityId: string,
  name: string,
  excludeProfileId?: FcuProfileId,
): boolean {
  const normalized = normalizeProfileName(name);
  if (!normalized) {
    return false;
  }

  return listProfiles(compatibilityId).some(
    (profile) =>
      profile.id !== excludeProfileId &&
      normalizeProfileName(getProfileDisplayName(profile)) === normalized,
  );
}

export function assertUniqueProfileName(
  compatibilityId: string,
  name: string,
  excludeProfileId?: FcuProfileId,
): void {
  const formatError = validateProfileName(name);
  if (formatError) {
    throw new Error(formatError);
  }

  if (isProfileNameTaken(compatibilityId, name, excludeProfileId)) {
    throw new Error('A profile with this name already exists');
  }
}
