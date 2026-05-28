import type { KeyValueStore } from '@/replicas/persistence';
import { defaultKeyValueStore } from '@/replicas/persistence';

import { PROFILE_DB_VERSION, PROFILE_STORAGE_KEY } from './constants';
import type { FcuProfile, FcuProfileCatalog } from './types';

export interface ProfileDatabase {
  version: typeof PROFILE_DB_VERSION;
  catalogs: Record<string, FcuProfileCatalog>;
}

function emptyDatabase(): ProfileDatabase {
  return { version: PROFILE_DB_VERSION, catalogs: {} };
}

function isProfile(value: unknown): value is FcuProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.firemodeName === 'string' &&
    typeof record.config === 'object' &&
    record.config !== null &&
    typeof record.isDefault === 'boolean'
  );
}

function isCatalog(value: unknown): value is FcuProfileCatalog {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.compatibilityId !== 'string' || !Array.isArray(record.profiles)) {
    return false;
  }
  return record.profiles.every(isProfile);
}

function parseDatabase(raw: string | null): ProfileDatabase {
  if (!raw) {
    return emptyDatabase();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return emptyDatabase();
    }

    const candidate = parsed as Partial<ProfileDatabase>;
    if (candidate.version !== PROFILE_DB_VERSION || !candidate.catalogs) {
      return emptyDatabase();
    }

    const catalogs: Record<string, FcuProfileCatalog> = {};
    for (const [key, catalog] of Object.entries(candidate.catalogs)) {
      if (isCatalog(catalog) && catalog.compatibilityId === key) {
        catalogs[key] = catalog;
      }
    }

    return { version: PROFILE_DB_VERSION, catalogs };
  } catch {
    return emptyDatabase();
  }
}

export async function loadProfileDatabase(
  store: KeyValueStore = defaultKeyValueStore,
): Promise<ProfileDatabase> {
  const raw = await store.getItem(PROFILE_STORAGE_KEY);
  return parseDatabase(raw);
}

export async function saveProfileDatabase(
  database: ProfileDatabase,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<void> {
  await store.setItem(PROFILE_STORAGE_KEY, JSON.stringify(database));
}

export async function clearProfileDatabaseForTests(
  store: KeyValueStore = defaultKeyValueStore,
): Promise<void> {
  await saveProfileDatabase(emptyDatabase(), store);
}
