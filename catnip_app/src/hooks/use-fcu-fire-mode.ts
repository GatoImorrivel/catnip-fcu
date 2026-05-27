import { useCallback, useState } from 'react';

import { syncFireModeConfigToFcu } from '@/fcu-profiles';
import type {
  FireModeConfigFields,
  FireModeName,
  FireModePositionConfig,
} from '@/messages/types';
import { UpdateFireModeConfigError } from '@/messages/types';
import { useCatnipFcu, type UseCatnipFcuOptions } from './use-catnip-fcu';
import { useFcuRequest, type UseFcuRequestOptions, type UseFcuRequestResult } from './use-fcu-request';

export type UseFcuSaveFireModeAssignmentResult = {
  save: (
    position: number,
    firemodeName: FireModeName,
    config: Record<string, string>,
  ) => Promise<UpdateFireModeConfigError | null>;
  saving: boolean;
  error: string | null;
  lastError: UpdateFireModeConfigError | null;
  clearStatus: () => void;
};

export function useFcuFireSelectorPosition(
  peripheralId: string | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<number> {
  return useFcuRequest(
    peripheralId,
    (client) => client.getCurrentFireSelectorPosition(),
    options,
  );
}

export function useFcuFireModeForPosition(
  peripheralId: string | null,
  position: number | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<FireModePositionConfig> {
  return useFcuRequest(
    peripheralId,
    (client) => client.getFireModeForPosition(position!),
    {
      ...options,
      fetchEnabled: (options.fetchEnabled ?? true) && position !== null,
      refetchDeps: [position],
    },
  );
}

export function useFcuSupportedFireModes(
  peripheralId: string | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<FireModeName[]> {
  return useFcuRequest(peripheralId, (client) => client.getSupportedFireModes(), options);
}

export function useFcuFireModeConfigFields(
  peripheralId: string | null,
  firemodeName: FireModeName | null,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<FireModeConfigFields> {
  return useFcuRequest(
    peripheralId,
    (client) => client.getFireModeConfigFields(firemodeName!),
    {
      ...options,
      fetchEnabled: (options.fetchEnabled ?? true) && firemodeName !== null,
      refetchDeps: [firemodeName],
    },
  );
}

export function useFcuUpdateFireModeConfig(
  peripheralId: string | null,
  position: number | null,
  firemodeName: FireModeName | null,
  config: Record<string, string> | null,
  options: Omit<UseFcuRequestOptions, 'fetchEnabled'> & { fetchEnabled?: boolean } = {},
): UseFcuRequestResult<UpdateFireModeConfigError | null> & {
  update: () => Promise<void>;
} {
  const { fetchEnabled: autoFetch = false, ...rest } = options;

  const result = useFcuRequest(
    peripheralId,
    (client) =>
      syncFireModeConfigToFcu(client, position!, firemodeName!, config ?? {}),
    {
      ...rest,
      fetchEnabled:
        autoFetch && position !== null && firemodeName !== null && config !== null,
      refetchDeps: [position, firemodeName, config],
    },
  );

  const update = async () => {
    if (!result.client || position === null || firemodeName === null || config === null) {
      throw new Error('FCU not connected or fire mode parameters not set');
    }
    await result.refetch();
  };

  return { ...result, update };
}

/** Imperative save for edit-position flows (no auto-fetch). */
export function useFcuSaveFireModeAssignment(
  peripheralId: string | null,
  options: UseCatnipFcuOptions = {},
): UseFcuSaveFireModeAssignmentResult {
  const { client, ready } = useCatnipFcu(peripheralId, options);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<UpdateFireModeConfigError | null>(null);

  const clearStatus = useCallback(() => {
    setError(null);
    setLastError(null);
  }, []);

  const save = useCallback(
    async (
      position: number,
      firemodeName: FireModeName,
      config: Record<string, string>,
    ): Promise<UpdateFireModeConfigError | null> => {
      if (!client || !ready) {
        const message = 'FCU not connected';
        setError(message);
        throw new Error(message);
      }

      setSaving(true);
      setError(null);
      setLastError(null);

      try {
        const result = await syncFireModeConfigToFcu(
          client,
          position,
          firemodeName,
          config,
        );
        if (result !== null) {
          setLastError(result);
        }
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [client, ready],
  );

  return { save, saving, error, lastError, clearStatus };
}
