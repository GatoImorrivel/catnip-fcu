import type { FcuProfile, FcuProfileId } from './types';

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

export function isProfileNameTakenInProfiles(
  profiles: FcuProfile[],
  name: string,
  excludeProfileId?: FcuProfileId,
): boolean {
  const normalized = normalizeProfileName(name);
  if (!normalized) {
    return false;
  }

  return profiles.some(
    (profile) =>
      profile.id !== excludeProfileId &&
      normalizeProfileName(getProfileDisplayName(profile)) === normalized,
  );
}

export function assertUniqueProfileNameInProfiles(
  profiles: FcuProfile[],
  name: string,
  excludeProfileId?: FcuProfileId,
): void {
  const formatError = validateProfileName(name);
  if (formatError) {
    throw new Error(formatError);
  }

  if (isProfileNameTakenInProfiles(profiles, name, excludeProfileId)) {
    throw new Error('A profile with this name already exists');
  }
}

/** @deprecated Use {@link isProfileNameTakenInProfiles} with a loaded profile list. */
export async function isProfileNameTaken(
  compatibilityId: string,
  name: string,
  excludeProfileId?: FcuProfileId,
): Promise<boolean> {
  const { listProfiles } = await import('./store');
  const profiles = await listProfiles(compatibilityId);
  return isProfileNameTakenInProfiles(profiles, name, excludeProfileId);
}

/** @deprecated Use {@link assertUniqueProfileNameInProfiles} with a loaded profile list. */
export async function assertUniqueProfileName(
  compatibilityId: string,
  name: string,
  excludeProfileId?: FcuProfileId,
): Promise<void> {
  const { listProfiles } = await import('./store');
  const profiles = await listProfiles(compatibilityId);
  assertUniqueProfileNameInProfiles(profiles, name, excludeProfileId);
}
