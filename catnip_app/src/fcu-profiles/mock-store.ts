import * as ExpoCrypto from 'expo-crypto';

import { defaultWireValuesFromSchema } from '@/lib/firemode-config-utils';
import { formatFireModeName, type FireModeName } from '@/messages/types';

import { getMockFireModeSchema, MOCK_SUPPORTED_FIRE_MODES } from './mock-firemode-schemas';
import { assertUniqueProfileName } from './profile-names';
import type { FcuProfile, FcuProfileCatalog, FcuProfileId } from './types';

const catalogs = new Map<string, FcuProfileCatalog>();

export function getDefaultProfileId(
  compatibilityId: string,
  firemodeName: FireModeName,
): string {
  return `default:${compatibilityId}:${firemodeName}`;
}

function defaultProfileId(compatibilityId: string, firemodeName: FireModeName): string {
  return getDefaultProfileId(compatibilityId, firemodeName);
}

function seedDefaultProfiles(compatibilityId: string): FcuProfileCatalog {
  const profiles: FcuProfile[] = MOCK_SUPPORTED_FIRE_MODES.map((firemodeName) => {
    const schema = getMockFireModeSchema(firemodeName);
    return {
      id: defaultProfileId(compatibilityId, firemodeName),
      name: formatFireModeName(firemodeName),
      firemodeName,
      config: defaultWireValuesFromSchema(schema),
      isDefault: true,
    };
  });

  const catalog: FcuProfileCatalog = { compatibilityId, profiles };
  catalogs.set(compatibilityId, catalog);
  return catalog;
}

/** Moves an in-memory catalog keyed by legacy BLE address to `compatibilityId`. */
export function migrateCatalogFromPeripheralId(
  peripheralId: string,
  compatibilityId: string,
): void {
  if (peripheralId === compatibilityId) {
    return;
  }
  const legacy = catalogs.get(peripheralId);
  if (!legacy || catalogs.has(compatibilityId)) {
    return;
  }
  catalogs.set(compatibilityId, { compatibilityId, profiles: legacy.profiles });
  catalogs.delete(peripheralId);
}

export function getOrCreateCatalog(compatibilityId: string): FcuProfileCatalog {
  const existing = catalogs.get(compatibilityId);
  if (existing) {
    return existing;
  }
  return seedDefaultProfiles(compatibilityId);
}

export function listProfiles(compatibilityId: string): FcuProfile[] {
  return [...getOrCreateCatalog(compatibilityId).profiles];
}

export function getProfile(
  compatibilityId: string,
  profileId: FcuProfileId,
): FcuProfile | undefined {
  return getOrCreateCatalog(compatibilityId).profiles.find((profile) => profile.id === profileId);
}

export function addProfile(
  compatibilityId: string,
  input: Omit<FcuProfile, 'id'> & { id?: FcuProfileId },
): FcuProfile {
  const catalog = getOrCreateCatalog(compatibilityId);
  if (!input.isDefault) {
    assertUniqueProfileName(compatibilityId, input.name);
  }
  const profile: FcuProfile = {
    id: input.id ?? ExpoCrypto.randomUUID(),
    name: input.name.trim(),
    firemodeName: input.firemodeName,
    config: { ...input.config },
    isDefault: input.isDefault ?? false,
  };
  catalog.profiles.push(profile);
  return profile;
}

export function removeProfile(compatibilityId: string, profileId: FcuProfileId): void {
  const catalog = getOrCreateCatalog(compatibilityId);
  const index = catalog.profiles.findIndex((profile) => profile.id === profileId);
  if (index < 0) {
    throw new Error('Profile not found');
  }

  if (catalog.profiles[index].isDefault) {
    throw new Error('Default profiles cannot be deleted');
  }

  catalog.profiles.splice(index, 1);
}

export function setDefaultProfileConfig(
  compatibilityId: string,
  firemodeName: FireModeName,
  config: Record<string, string>,
): FcuProfile {
  const catalog = getOrCreateCatalog(compatibilityId);
  const index = catalog.profiles.findIndex(
    (profile) => profile.isDefault && profile.firemodeName === firemodeName,
  );

  if (index < 0) {
    const profile: FcuProfile = {
      id: defaultProfileId(compatibilityId, firemodeName),
      name: formatFireModeName(firemodeName),
      firemodeName,
      config: { ...config },
      isDefault: true,
    };
    catalog.profiles.push(profile);
    return profile;
  }

  const updated: FcuProfile = {
    ...catalog.profiles[index],
    config: { ...config },
  };
  catalog.profiles[index] = updated;
  return updated;
}

export function updateProfile(
  compatibilityId: string,
  profileId: FcuProfileId,
  config: Record<string, string>,
): FcuProfile {
  const catalog = getOrCreateCatalog(compatibilityId);
  const index = catalog.profiles.findIndex((profile) => profile.id === profileId);
  if (index < 0) {
    throw new Error('Profile not found');
  }

  const existing = catalog.profiles[index];
  if (existing.isDefault) {
    throw new Error('Default profiles cannot be edited');
  }

  const updated: FcuProfile = {
    ...existing,
    config: { ...config },
  };
  catalog.profiles[index] = updated;
  return updated;
}

export function getMockSupportedFireModes(): FireModeName[] {
  return [...MOCK_SUPPORTED_FIRE_MODES];
}

export function clearCatalogsForTests(): void {
  catalogs.clear();
}
