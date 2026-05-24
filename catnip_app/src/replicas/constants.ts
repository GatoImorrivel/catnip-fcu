export const REPLICA_STORAGE_KEY = '@catnip/replicas/v1';

export const REPLICA_DB_VERSION = 1 as const;

/** Keys managed by the repository; do not pass these in create/update payloads. */
export const REPLICA_RESERVED_KEYS = [
  'id',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof import('./types').ReplicaCore)[];
