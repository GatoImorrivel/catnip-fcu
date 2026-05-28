import { useCallback, useEffect, useReducer, useState } from 'react';

import { useCatnipFcu, type UseCatnipFcuOptions } from '@/hooks/use-catnip-fcu';
import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import {
  ensureFcuSessionCharacteristics,
  getFcuSessionCharacteristics,
  getFcuSessionCharacteristicsError,
  reconnectFcuSession,
  subscribeFcuSession,
} from '@/lib/fcu-connection-session';
import type { Characteristics } from '@/messages/types';

export type UseCreateReplicaFcuResult = {
  characteristics: Characteristics | null;
  client: CatnipBleClient | null;
  ready: boolean;
  connectionStatus: ReturnType<typeof useCatnipFcu>['status'];
  error: string | null;
  reconnect: () => void;
};

/**
 * Subscribes to the FCU session started on the Pair FCU screen. Characteristics are read once
 * there and cached on the session; this hook does not re-fetch unless the user reconnects.
 */
export function useCreateReplicaFcu(
  peripheralId: string,
  options: Pick<UseCatnipFcuOptions, 'onEvent'> = {},
): UseCreateReplicaFcuResult {
  const [, bumpSession] = useReducer((version: number) => version + 1, 0);

  useEffect(() => {
    if (!peripheralId) {
      return;
    }

    return subscribeFcuSession(peripheralId, () => {
      bumpSession();
    });
  }, [peripheralId]);

  const { client, status, error: connectionError, ready } = useCatnipFcu(peripheralId, {
    ...options,
    manageConnection: false,
  });

  const [characteristicsError, setCharacteristicsError] = useState<string | null>(null);

  useEffect(() => {
    if (!peripheralId || !ready) {
      return;
    }

    if (getFcuSessionCharacteristics(peripheralId)) {
      setCharacteristicsError(null);
      return;
    }

    void ensureFcuSessionCharacteristics(peripheralId).catch((err: unknown) => {
      setCharacteristicsError(
        err instanceof Error ? err.message : 'Failed to read FCU characteristics',
      );
    });
  }, [peripheralId, ready]);

  const reconnect = useCallback(() => {
    setCharacteristicsError(null);
    reconnectFcuSession(peripheralId);
    void ensureFcuSessionCharacteristics(peripheralId).catch((err: unknown) => {
      setCharacteristicsError(
        err instanceof Error ? err.message : 'Failed to read FCU characteristics',
      );
    });
  }, [peripheralId]);

  const characteristics = getFcuSessionCharacteristics(peripheralId);
  const sessionCharacteristicsError = getFcuSessionCharacteristicsError(peripheralId);

  return {
    characteristics,
    client,
    ready,
    connectionStatus: status,
    error: connectionError ?? characteristicsError ?? sessionCharacteristicsError,
    reconnect,
  };
}
