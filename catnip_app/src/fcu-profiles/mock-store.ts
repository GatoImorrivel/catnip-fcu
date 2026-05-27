import * as ExpoCrypto from 'expo-crypto';

import { defaultWireValuesFromSchema } from '@/lib/firemode-config-utils';
import { formatFireModeName, type FireModeName } from '@/messages/types';

import { getMockFireModeSchema, MOCK_SUPPORTED_FIRE_MODES } from './mock-firemode-schemas';
import { assertUniqueProfileName } from './profile-names';
import type { FcuProfile, FcuProfileCatalog, FcuProfileId } from './types';

const catalogs = new Map<string, FcuProfileCatalog>();

function defaultProfileId(fcuId: string, firemodeName: FireModeName): string {
  return `default:${fcuId}:${firemodeName}`;
}

function seedDefaultProfiles(fcuId: string): FcuProfileCatalog {
  const profiles: FcuProfile[] = MOCK_SUPPORTED_FIRE_MODES.map((firemodeName) => {
    const schema = getMockFireModeSchema(firemodeName);
    return {
      id: defaultProfileId(fcuId, firemodeName),
      name: formatFireModeName(firemodeName),
      firemodeName,
      config: defaultWireValuesFromSchema(schema),
      isDefault: true,
    };
  });

  const catalog: FcuProfileCatalog = { fcuId, profiles };
  catalogs.set(fcuId, catalog);
  return catalog;
}

export function getOrCreateCatalog(fcuId: string): FcuProfileCatalog {
  const existing = catalogs.get(fcuId);
  if (existing) {
    return existing;
  }
  return seedDefaultProfiles(fcuId);
}

export function listProfiles(fcuId: string): FcuProfile[] {
  return [...getOrCreateCatalog(fcuId).profiles];
}

export function getProfile(fcuId: string, profileId: FcuProfileId): FcuProfile | undefined {
  return getOrCreateCatalog(fcuId).profiles.find((profile) => profile.id === profileId);
}

export function addProfile(
  fcuId: string,
  input: Omit<FcuProfile, 'id'> & { id?: FcuProfileId },
): FcuProfile {
  const catalog = getOrCreateCatalog(fcuId);
  if (!input.isDefault) {
    assertUniqueProfileName(fcuId, input.name);
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

export function removeProfile(fcuId: string, profileId: FcuProfileId): void {
  const catalog = getOrCreateCatalog(fcuId);
  const index = catalog.profiles.findIndex((profile) => profile.id === profileId);
  if (index < 0) {
    throw new Error('Profile not found');
  }

  if (catalog.profiles[index].isDefault) {
    throw new Error('Default profiles cannot be deleted');
  }

  catalog.profiles.splice(index, 1);
}

export function updateProfile(
  fcuId: string,
  profileId: FcuProfileId,
  config: Record<string, string>,
): FcuProfile {
  const catalog = getOrCreateCatalog(fcuId);
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
