import { REPLICA_DB_VERSION, REPLICA_STORAGE_KEY } from './constants';
import { ReplicaStorageUnavailableError } from './errors';
import type { Replica } from './types';

export interface ReplicaDatabase {
  version: typeof REPLICA_DB_VERSION;
  replicas: Record<string, Replica>;
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_PROBE_KEY = '@catnip/storage-probe';

let cachedStore: KeyValueStore | null = null;
let resolvePromise: Promise<KeyValueStore> | null = null;

async function resolveAsyncStorage(): Promise<KeyValueStore> {
  if (cachedStore) {
    return cachedStore;
  }

  if (resolvePromise) {
    return resolvePromise;
  }

  resolvePromise = (async () => {
    let store: KeyValueStore;
    try {
      const module = require('@react-native-async-storage/async-storage') as {
        default: KeyValueStore;
      };
      store = module.default;
    } catch (err: unknown) {
      throw new ReplicaStorageUnavailableError(
        err instanceof Error ? err.message : undefined,
      );
    }

    try {
      await store.getItem(STORAGE_PROBE_KEY);
    } catch (err: unknown) {
      throw new ReplicaStorageUnavailableError(
        err instanceof Error ? err.message : undefined,
      );
    }

    cachedStore = store;
    return store;
  })();

  return resolvePromise;
}

/** Deferred until first read/write — avoids eager native module init at import time. */
export const defaultKeyValueStore: KeyValueStore = {
  getItem(key) {
    return resolveAsyncStorage().then((store) => store.getItem(key));
  },
  setItem(key, value) {
    return resolveAsyncStorage().then((store) => store.setItem(key, value));
  },
};

function emptyDatabase(): ReplicaDatabase {
  return { version: REPLICA_DB_VERSION, replicas: {} };
}

function isReplica(value: unknown): value is Replica {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.type === 'string' &&
    typeof record.bluetoothMac === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
}

function parseDatabase(raw: string | null): ReplicaDatabase {
  if (!raw) {
    return emptyDatabase();
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return emptyDatabase();
    }

    const candidate = parsed as Partial<ReplicaDatabase>;
    if (candidate.version !== REPLICA_DB_VERSION || !candidate.replicas) {
      return emptyDatabase();
    }

    const replicas: Record<string, Replica> = {};
    for (const [id, replica] of Object.entries(candidate.replicas)) {
      if (isReplica(replica) && replica.id === id) {
        replicas[id] = replica;
      }
    }

    return { version: REPLICA_DB_VERSION, replicas };
  } catch {
    return emptyDatabase();
  }
}

export async function loadReplicaDatabase(
  store: KeyValueStore = defaultKeyValueStore,
): Promise<ReplicaDatabase> {
  const raw = await store.getItem(REPLICA_STORAGE_KEY);
  return parseDatabase(raw);
}

export async function saveReplicaDatabase(
  database: ReplicaDatabase,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<void> {
  await store.setItem(REPLICA_STORAGE_KEY, JSON.stringify(database));
}
