export class ReplicaNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`Replica not found: ${id}`);
    this.name = 'ReplicaNotFoundError';
    this.id = id;
  }
}

export class ReplicaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReplicaValidationError';
  }
}

export class ReplicaStorageUnavailableError extends Error {
  constructor(detail?: string) {
    super(
      detail
        ? `Local replica storage is unavailable (${detail}). Rebuild the dev client: npm run android`
        : 'Local replica storage is unavailable. Rebuild the dev client: npm run android',
    );
    this.name = 'ReplicaStorageUnavailableError';
  }
}
