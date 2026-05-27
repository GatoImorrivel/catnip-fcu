import { useCallback, useEffect, useReducer } from 'react';

import { useCatnipFcu, type UseCatnipFcuOptions } from '@/hooks/use-catnip-fcu';
import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import {
  ensureFcuSessionCharacteristics,
  getFcuSessionCharacteristics,
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

  const { client, status, error, ready } = useCatnipFcu(peripheralId, {
    ...options,
    manageConnection: false,
  });

  useEffect(() => {
    if (!peripheralId || !ready) {
      return;
    }

    if (getFcuSessionCharacteristics(peripheralId)) {
      return;
    }

    void ensureFcuSessionCharacteristics(peripheralId).catch(() => undefined);
  }, [peripheralId, ready]);

  const reconnect = useCallback(() => {
    reconnectFcuSession(peripheralId);
    void ensureFcuSessionCharacteristics(peripheralId).catch(() => undefined);
  }, [peripheralId]);

  const characteristics = getFcuSessionCharacteristics(peripheralId);

  return {
    characteristics,
    client,
    ready,
    connectionStatus: status,
    error,
    reconnect,
  };
}
