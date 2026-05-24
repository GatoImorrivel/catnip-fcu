import { REPLICA_TYPES, type ReplicaType } from './types';
import { ReplicaValidationError } from './errors';

export function assertReplicaType(value: unknown): ReplicaType {
  if (typeof value !== 'string' || !REPLICA_TYPES.includes(value as ReplicaType)) {
    throw new ReplicaValidationError(
      `type must be one of: ${REPLICA_TYPES.join(', ')}`,
    );
  }

  return value as ReplicaType;
}

export function normalizeBluetoothMac(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ReplicaValidationError('bluetoothMac must be a string');
  }

  const bluetoothMac = value.trim();
  if (!bluetoothMac) {
    throw new ReplicaValidationError('bluetoothMac cannot be empty');
  }

  return bluetoothMac;
}

export function normalizeFcuName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ReplicaValidationError('fcuName must be a string');
  }

  const fcuName = value.trim();
  if (!fcuName) {
    throw new ReplicaValidationError('fcuName cannot be empty');
  }

  return fcuName;
}

export function normalizeReplicaName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ReplicaValidationError('name must be a string');
  }

  const name = value.trim();
  if (!name) {
    throw new ReplicaValidationError('name cannot be empty');
  }

  return name;
}

export function omitReservedKeys<T extends Record<string, unknown>>(
  input: T,
): Record<string, unknown> {
  const { id, createdAt, updatedAt, ...rest } = input;
  void id;
  void createdAt;
  void updatedAt;
  return rest;
}
