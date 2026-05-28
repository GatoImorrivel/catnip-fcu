import * as ExpoCrypto from 'expo-crypto';

import type { KeyValueStore } from '@/replicas/persistence';
import { defaultKeyValueStore } from '@/replicas/persistence';
import { formatFireModeName, type FireModeName } from '@/messages/types';

import { MOCK_SUPPORTED_FIRE_MODES } from './mock-firemode-schemas';
import {
  loadProfileDatabase,
  saveProfileDatabase,
  type ProfileDatabase,
} from './persistence';
import { assertUniqueProfileNameInProfiles } from './profile-names';
import { reassignReplicasAfterProfileDelete } from './reassign-on-profile-delete';
import type { FcuProfile, FcuProfileCatalog, FcuProfileId } from './types';

let cachedDatabase: ProfileDatabase | null = null;

function invalidateCache(): void {
  cachedDatabase = null;
}

async function readDatabase(store: KeyValueStore): Promise<ProfileDatabase> {
  if (cachedDatabase) {
    return cachedDatabase;
  }
  cachedDatabase = await loadProfileDatabase(store);
  return cachedDatabase;
}

async function writeDatabase(database: ProfileDatabase, store: KeyValueStore): Promise<void> {
  cachedDatabase = database;
  await saveProfileDatabase(database, store);
}

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
    return {
      id: defaultProfileId(compatibilityId, firemodeName),
      name: formatFireModeName(firemodeName),
      firemodeName,
      config: {},
      isDefault: true,
    };
  });

  return { compatibilityId, profiles };
}

export async function getOrCreateCatalog(
  compatibilityId: string,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<FcuProfileCatalog> {
  const database = await readDatabase(store);
  const existing = database.catalogs[compatibilityId];
  if (existing) {
    return existing;
  }

  const catalog = seedDefaultProfiles(compatibilityId);
  database.catalogs[compatibilityId] = catalog;
  await writeDatabase(database, store);
  return catalog;
}

export async function listProfiles(
  compatibilityId: string,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<FcuProfile[]> {
  const catalog = await getOrCreateCatalog(compatibilityId, store);
  return [...catalog.profiles];
}

export async function getProfile(
  compatibilityId: string,
  profileId: FcuProfileId,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<FcuProfile | undefined> {
  const catalog = await getOrCreateCatalog(compatibilityId, store);
  return catalog.profiles.find((profile) => profile.id === profileId);
}

export async function addProfile(
  compatibilityId: string,
  input: Omit<FcuProfile, 'id'> & { id?: FcuProfileId },
  store: KeyValueStore = defaultKeyValueStore,
): Promise<FcuProfile> {
  const database = await readDatabase(store);
  const catalog = database.catalogs[compatibilityId] ?? seedDefaultProfiles(compatibilityId);
  if (!database.catalogs[compatibilityId]) {
    database.catalogs[compatibilityId] = catalog;
  }

  if (!input.isDefault) {
    assertUniqueProfileNameInProfiles(catalog.profiles, input.name);
  }

  const profile: FcuProfile = {
    id: input.id ?? ExpoCrypto.randomUUID(),
    name: input.name.trim(),
    firemodeName: input.firemodeName,
    config: { ...input.config },
    isDefault: input.isDefault ?? false,
  };
  catalog.profiles.push(profile);
  await writeDatabase(database, store);
  return profile;
}

export async function removeProfile(
  compatibilityId: string,
  profileId: FcuProfileId,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<void> {
  const database = await readDatabase(store);
  const catalog = database.catalogs[compatibilityId];
  if (!catalog) {
    throw new Error('Profile not found');
  }

  const index = catalog.profiles.findIndex((profile) => profile.id === profileId);
  if (index < 0) {
    throw new Error('Profile not found');
  }

  const removed = catalog.profiles[index];
  if (removed.isDefault) {
    throw new Error('Default profiles cannot be deleted');
  }

  const replacementProfileId = getDefaultProfileId(compatibilityId, removed.firemodeName);
  catalog.profiles.splice(index, 1);
  await writeDatabase(database, store);

  await reassignReplicasAfterProfileDelete(
    compatibilityId,
    profileId,
    replacementProfileId,
    store,
  );
}

export async function setDefaultProfileConfig(
  compatibilityId: string,
  firemodeName: FireModeName,
  config: Record<string, string>,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<FcuProfile> {
  const database = await readDatabase(store);
  const catalog = database.catalogs[compatibilityId] ?? seedDefaultProfiles(compatibilityId);
  if (!database.catalogs[compatibilityId]) {
    database.catalogs[compatibilityId] = catalog;
  }

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
    await writeDatabase(database, store);
    return profile;
  }

  const updated: FcuProfile = {
    ...catalog.profiles[index],
    config: { ...config },
  };
  catalog.profiles[index] = updated;
  await writeDatabase(database, store);
  return updated;
}

export async function updateProfile(
  compatibilityId: string,
  profileId: FcuProfileId,
  config: Record<string, string>,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<FcuProfile> {
  const database = await readDatabase(store);
  const catalog = database.catalogs[compatibilityId];
  if (!catalog) {
    throw new Error('Profile not found');
  }

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
  await writeDatabase(database, store);
  return updated;
}

export function getMockSupportedFireModes(): FireModeName[] {
  return [...MOCK_SUPPORTED_FIRE_MODES];
}

export function invalidateProfileStoreCache(): void {
  invalidateCache();
}
