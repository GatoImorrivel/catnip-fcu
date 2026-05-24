/** Supported replica platforms; extend this union when you add new types. */
export const REPLICA_TYPES = ['M4', 'AK'] as const;

export type ReplicaType = (typeof REPLICA_TYPES)[number];

/** Core fields persisted for every replica. Extend this interface as the schema grows. */
export interface ReplicaCore {
  id: string;
  name: string;
  type: ReplicaType;
  /** BLE peripheral id (MAC on Android) captured when the FCU was paired at creation. */
  bluetoothMac: string;
  /** Advertised / local BLE name captured when the FCU was paired at creation. */
  fcuName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full replica record. Additional top-level keys are kept on disk and round-trip
 * through create/update — use them for fields you are experimenting with by hand.
 */
export type Replica = ReplicaCore & Record<string, unknown>;

/** Shallow list entry (no timestamps or custom fields). */
export type ReplicaSummary = Pick<ReplicaCore, 'id' | 'name' | 'type' | 'fcuName'>;

export type CreateReplicaInput = {
  name: string;
  type: ReplicaType;
  bluetoothMac: string;
  fcuName: string;
} & Record<string, unknown>;

export type UpdateReplicaInput = Partial<{
  name: string;
  type: ReplicaType;
  bluetoothMac: string;
  fcuName: string;
}> &
  Record<string, unknown>;
