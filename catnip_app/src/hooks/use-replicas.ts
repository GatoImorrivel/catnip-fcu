import { useCallback, useEffect, useState } from 'react';

import {
  replicaRepository,
  type CreateReplicaInput,
  type Replica,
  type ReplicaRepository,
  type ReplicaSummary,
  type UpdateReplicaInput,
} from '@/replicas';

export interface UseReplicasResult {
  replicas: ReplicaSummary[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  get: (id: string) => Promise<Replica | null>;
  create: (input: CreateReplicaInput) => Promise<Replica>;
  update: (id: string, input: UpdateReplicaInput) => Promise<Replica>;
  remove: (id: string) => Promise<void>;
}

export interface UseReplicasOptions {
  repository?: ReplicaRepository;
}

export function useReplicas({
  repository = replicaRepository,
}: UseReplicasOptions = {}): UseReplicasResult {
  const [replicas, setReplicas] = useState<ReplicaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setReplicas(await repository.list());
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateReplicaInput) => {
      const replica = await repository.create(input);
      await refresh();
      return replica;
    },
    [repository, refresh],
  );

  const update = useCallback(
    async (id: string, input: UpdateReplicaInput) => {
      const replica = await repository.update(id, input);
      await refresh();
      return replica;
    },
    [repository, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await repository.delete(id);
      await refresh();
    },
    [repository, refresh],
  );

  const get = useCallback((id: string) => repository.get(id), [repository]);

  return {
    replicas,
    loading,
    error,
    refresh,
    get,
    create,
    update,
    remove,
  };
}
