import * as ExpoCrypto from 'expo-crypto';
import { ReplicaNotFoundError } from './errors';
import {
  loadReplicaDatabase,
  saveReplicaDatabase,
  type KeyValueStore,
  defaultKeyValueStore,
} from './persistence';
import type {
  CreateReplicaInput,
  Replica,
  ReplicaSummary,
  UpdateReplicaInput,
} from './types';
import {
  assertReplicaType,
  normalizeBluetoothMac,
  normalizeFcuCompatibilityId,
  normalizeFcuName,
  normalizeReplicaName,
  omitReservedKeys,
} from './validation';

export interface ReplicaRepository {
  list(): Promise<ReplicaSummary[]>;
  get(id: string): Promise<Replica | null>;
  create(input: CreateReplicaInput): Promise<Replica>;
  update(id: string, input: UpdateReplicaInput): Promise<Replica>;
  delete(id: string): Promise<void>;
}

function toSummary(replica: Replica): ReplicaSummary {
  return {
    id: replica.id,
    name: replica.name,
    type: replica.type,
    fcuName: replica.fcuName,
  };
}

function sortSummaries(a: ReplicaSummary, b: ReplicaSummary): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export function createReplicaRepository(
  store: KeyValueStore = defaultKeyValueStore,
): ReplicaRepository {
  return {
    async list() {
      const database = await loadReplicaDatabase(store);
      return Object.values(database.replicas).map(toSummary).sort(sortSummaries);
    },

    async get(id) {
      const database = await loadReplicaDatabase(store);
      return database.replicas[id] ?? null;
    },

    async create(input) {
      const database = await loadReplicaDatabase(store);
      const extras = omitReservedKeys(input);
      const now = new Date().toISOString();

      const replica: Replica = {
        ...extras,
        id: ExpoCrypto.randomUUID(),
        name: normalizeReplicaName(input.name),
        type: assertReplicaType(input.type),
        bluetoothMac: normalizeBluetoothMac(input.bluetoothMac),
        fcuName: normalizeFcuName(input.fcuName),
        fcuCompatibilityId: normalizeFcuCompatibilityId(input.fcuCompatibilityId),
        createdAt: now,
        updatedAt: now,
      };

      database.replicas[replica.id] = replica;
      await saveReplicaDatabase(database, store);
      return replica;
    },

    async update(id, input) {
      const database = await loadReplicaDatabase(store);
      const existing = database.replicas[id];
      if (!existing) {
        throw new ReplicaNotFoundError(id);
      }

      const extras = omitReservedKeys(input);
      const patch: Record<string, unknown> = { ...extras };

      if ('name' in input && input.name !== undefined) {
        patch.name = normalizeReplicaName(input.name);
      }

      if ('type' in input && input.type !== undefined) {
        patch.type = assertReplicaType(input.type);
      }

      if ('bluetoothMac' in input && input.bluetoothMac !== undefined) {
        patch.bluetoothMac = normalizeBluetoothMac(input.bluetoothMac);
      }

      if ('fcuName' in input && input.fcuName !== undefined) {
        patch.fcuName = normalizeFcuName(input.fcuName);
      }

      if ('fcuCompatibilityId' in input && input.fcuCompatibilityId !== undefined) {
        patch.fcuCompatibilityId = normalizeFcuCompatibilityId(input.fcuCompatibilityId);
      }

      const updated: Replica = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };

      database.replicas[id] = updated;
      await saveReplicaDatabase(database, store);
      return updated;
    },

    async delete(id) {
      const database = await loadReplicaDatabase(store);
      if (!database.replicas[id]) {
        throw new ReplicaNotFoundError(id);
      }

      delete database.replicas[id];
      await saveReplicaDatabase(database, store);
    },
  };
}

/** App-wide replica store backed by AsyncStorage. */
export const replicaRepository = createReplicaRepository();
