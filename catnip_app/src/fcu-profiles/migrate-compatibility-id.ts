import {
  defaultKeyValueStore,
  loadReplicaDatabase,
  saveReplicaDatabase,
  type KeyValueStore,
} from '@/replicas/persistence';

import { parseSelectorPositionProfiles } from './assignments';
import { getDefaultProfileId, invalidateProfileStoreCache } from './store';
import { loadProfileDatabase, saveProfileDatabase, type ProfileDatabase } from './persistence';
import type { FcuProfile, FcuProfileCatalog, FcuProfileId } from './types';

function remapDefaultProfileId(
  profileId: FcuProfileId,
  oldCompatibilityId: string,
  newCompatibilityId: string,
): FcuProfileId {
  const prefix = `default:${oldCompatibilityId}:`;
  if (!profileId.startsWith(prefix)) {
    return profileId;
  }
  const firemodeName = profileId.slice(prefix.length);
  return getDefaultProfileId(newCompatibilityId, firemodeName);
}

function migrateCatalogProfileIds(
  catalog: FcuProfileCatalog,
  oldCompatibilityId: string,
  newCompatibilityId: string,
): FcuProfileCatalog {
  const profiles: FcuProfile[] = catalog.profiles.map((profile) => {
    const nextId = remapDefaultProfileId(profile.id, oldCompatibilityId, newCompatibilityId);
    if (nextId === profile.id) {
      return profile;
    }
    return { ...profile, id: nextId };
  });

  return {
    compatibilityId: newCompatibilityId,
    profiles,
  };
}

function migrateProfileDatabase(
  database: ProfileDatabase,
  oldCompatibilityId: string,
  newCompatibilityId: string,
): ProfileDatabase {
  if (oldCompatibilityId === newCompatibilityId) {
    return database;
  }

  const oldCatalog = database.catalogs[oldCompatibilityId];
  const existingNew = database.catalogs[newCompatibilityId];

  const catalogs = { ...database.catalogs };

  if (oldCatalog) {
    const migrated = migrateCatalogProfileIds(oldCatalog, oldCompatibilityId, newCompatibilityId);
    if (existingNew) {
      const mergedById = new Map<string, FcuProfile>();
      for (const profile of existingNew.profiles) {
        mergedById.set(profile.id, profile);
      }
      for (const profile of migrated.profiles) {
        if (!mergedById.has(profile.id)) {
          mergedById.set(profile.id, profile);
        }
      }
      catalogs[newCompatibilityId] = {
        compatibilityId: newCompatibilityId,
        profiles: [...mergedById.values()],
      };
    } else {
      catalogs[newCompatibilityId] = migrated;
    }
    delete catalogs[oldCompatibilityId];
  }

  return { ...database, catalogs };
}

async function migrateReplicaAssignments(
  oldCompatibilityId: string,
  newCompatibilityId: string,
  store: KeyValueStore,
): Promise<void> {
  const replicaDb = await loadReplicaDatabase(store);
  let dirty = false;

  for (const replica of Object.values(replicaDb.replicas)) {
    const storedId = replica.fcuCompatibilityId;
    if (storedId !== oldCompatibilityId && storedId !== newCompatibilityId) {
      continue;
    }

    const assignments = parseSelectorPositionProfiles(replica);
    const nextAssignments = assignments.map((entry) => {
      const nextProfileId = remapDefaultProfileId(
        entry.profileId,
        oldCompatibilityId,
        newCompatibilityId,
      );
      if (nextProfileId === entry.profileId) {
        return entry;
      }
      return { ...entry, profileId: nextProfileId };
    });

    const assignmentsChanged =
      nextAssignments.length !== assignments.length ||
      nextAssignments.some(
        (entry, index) =>
          entry.profileId !== assignments[index]?.profileId ||
          entry.fcuPosition !== assignments[index]?.fcuPosition,
      );

    const needsCompatibilityUpdate = storedId === oldCompatibilityId;

    if (!assignmentsChanged && !needsCompatibilityUpdate) {
      continue;
    }

    replicaDb.replicas[replica.id] = {
      ...replica,
      ...(needsCompatibilityUpdate ? { fcuCompatibilityId: newCompatibilityId } : {}),
      ...(assignmentsChanged ? { selectorPositionProfiles: nextAssignments } : {}),
      updatedAt: new Date().toISOString(),
    };
    dirty = true;
  }

  if (dirty) {
    await saveReplicaDatabase(replicaDb, store);
  }
}

/**
 * When live FCU {@link compatibility_id} differs from stored replica value, remaps
 * default profile ids and replica assignments from `oldCompatibilityId` to `newCompatibilityId`.
 */
export async function migrateCompatibilityId(
  oldCompatibilityId: string,
  newCompatibilityId: string,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<void> {
  if (!oldCompatibilityId || !newCompatibilityId || oldCompatibilityId === newCompatibilityId) {
    return;
  }

  const database = await loadProfileDatabase(store);
  const migrated = migrateProfileDatabase(database, oldCompatibilityId, newCompatibilityId);
  await saveProfileDatabase(migrated, store);
  invalidateProfileStoreCache();
  await migrateReplicaAssignments(oldCompatibilityId, newCompatibilityId, store);
}
