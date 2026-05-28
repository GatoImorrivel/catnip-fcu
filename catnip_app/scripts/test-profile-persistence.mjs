/**
 * Profile catalog persistence + delete reassignment tests. Run: npm test
 */
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

const PROFILE_STORAGE_KEY = '@catnip/fcu-profiles/v1';
const REPLICA_STORAGE_KEY = '@catnip/replicas/v1';
const PROFILE_DB_VERSION = 1;
const REPLICA_DB_VERSION = 1;

function createMemoryStore() {
  const data = new Map();
  return {
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
  };
}

function emptyProfileDb() {
  return { version: PROFILE_DB_VERSION, catalogs: {} };
}

function parseProfileDb(raw) {
  if (!raw) {
    return emptyProfileDb();
  }
  const parsed = JSON.parse(raw);
  if (parsed?.version !== PROFILE_DB_VERSION || !parsed.catalogs) {
    return emptyProfileDb();
  }
  return parsed;
}

function parseReplicaDb(raw) {
  if (!raw) {
    return { version: REPLICA_DB_VERSION, replicas: {} };
  }
  const parsed = JSON.parse(raw);
  if (parsed?.version !== REPLICA_DB_VERSION || !parsed.replicas) {
    return { version: REPLICA_DB_VERSION, replicas: {} };
  }
  return parsed;
}

function getDefaultProfileId(compatibilityId, firemodeName) {
  return `default:${compatibilityId}:${firemodeName}`;
}

function reassignReplicasAfterProfileDelete(
  replicaDb,
  compatibilityId,
  deletedProfileId,
  replacementProfileId,
) {
  let dirty = false;
  for (const replica of Object.values(replicaDb.replicas)) {
    if (replica.fcuCompatibilityId !== compatibilityId) {
      continue;
    }
    const assignments = replica.selectorPositionProfiles ?? [];
    let changed = false;
    const next = assignments.map((entry) => {
      if (entry.profileId !== deletedProfileId) {
        return entry;
      }
      changed = true;
      return { ...entry, profileId: replacementProfileId };
    });
    if (!changed) {
      continue;
    }
    replicaDb.replicas[replica.id] = {
      ...replica,
      selectorPositionProfiles: next,
    };
    dirty = true;
  }
  return dirty;
}

describe('profile persistence', () => {
  /** @type {ReturnType<typeof createMemoryStore>} */
  let store;

  beforeEach(() => {
    store = createMemoryStore();
  });

  it('round-trips profile database JSON', async () => {
    const compatibilityId = 'catnip.test-fcu';
    const catalog = {
      compatibilityId,
      profiles: [
        {
          id: getDefaultProfileId(compatibilityId, 'SemiAuto'),
          name: 'Semi Auto',
          firemodeName: 'SemiAuto',
          config: { rate_of_fire: '10' },
          isDefault: true,
        },
      ],
    };
    const db = { version: PROFILE_DB_VERSION, catalogs: { [compatibilityId]: catalog } };
    await store.setItem(PROFILE_STORAGE_KEY, JSON.stringify(db));

    const loaded = parseProfileDb(await store.getItem(PROFILE_STORAGE_KEY));
    assert.deepEqual(loaded.catalogs[compatibilityId], catalog);
  });

  it('reassigns replica assignments when a shared profile is deleted', async () => {
    const compatibilityId = 'catnip.shared';
    const customId = 'custom-profile-id';
    const defaultId = getDefaultProfileId(compatibilityId, 'SemiAuto');

    const replicaDb = {
      version: REPLICA_DB_VERSION,
      replicas: {
        r1: {
          id: 'r1',
          fcuCompatibilityId: compatibilityId,
          selectorPositionProfiles: [{ fcuPosition: 0, profileId: customId }],
        },
        r2: {
          id: 'r2',
          fcuCompatibilityId: compatibilityId,
          selectorPositionProfiles: [
            { fcuPosition: 1, profileId: customId },
            { fcuPosition: 2, profileId: 'other-profile' },
          ],
        },
        r3: {
          id: 'r3',
          fcuCompatibilityId: 'other.compat',
          selectorPositionProfiles: [{ fcuPosition: 0, profileId: customId }],
        },
      },
    };

    const dirty = reassignReplicasAfterProfileDelete(
      replicaDb,
      compatibilityId,
      customId,
      defaultId,
    );
    assert.equal(dirty, true);
    assert.equal(replicaDb.replicas.r1.selectorPositionProfiles[0].profileId, defaultId);
    assert.equal(replicaDb.replicas.r2.selectorPositionProfiles[0].profileId, defaultId);
    assert.equal(replicaDb.replicas.r2.selectorPositionProfiles[1].profileId, 'other-profile');
    assert.equal(replicaDb.replicas.r3.selectorPositionProfiles[0].profileId, customId);
  });

  it('persists reassigned replicas through storage round-trip', async () => {
    const compatibilityId = 'catnip.shared';
    const customId = 'custom-profile-id';
    const defaultId = getDefaultProfileId(compatibilityId, 'SemiAuto');
    const replicaDb = parseReplicaDb(null);
    replicaDb.replicas.r1 = {
      id: 'r1',
      fcuCompatibilityId: compatibilityId,
      selectorPositionProfiles: [{ fcuPosition: 0, profileId: customId }],
    };
    reassignReplicasAfterProfileDelete(replicaDb, compatibilityId, customId, defaultId);
    await store.setItem(REPLICA_STORAGE_KEY, JSON.stringify(replicaDb));

    const loaded = parseReplicaDb(await store.getItem(REPLICA_STORAGE_KEY));
    assert.equal(loaded.replicas.r1.selectorPositionProfiles[0].profileId, defaultId);
  });
});
