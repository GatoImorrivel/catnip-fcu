import { useCallback, useEffect, useRef, useState } from 'react';

import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import {
  useCatnipFcu,
  type CatnipFcuStatus,
  type UseCatnipFcuOptions,
} from './use-catnip-fcu';

export type UseFcuRequestOptions = UseCatnipFcuOptions & {
  /** When false, skips the fetch even if the client is ready. Defaults to true. */
  fetchEnabled?: boolean;
};

export type UseFcuRequestResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  client: CatnipBleClient | null;
  connectionStatus: CatnipFcuStatus;
  ready: boolean;
  reconnect: () => void;
};

/**
 * Runs an FCU request once the GATT session is ready.
 *
 * Connection lifecycle is handled by {@link useCatnipFcu}; `fetcher` is called when
 * `client` becomes available (and on `refetch`).
 */
export function useFcuRequest<T>(
  peripheralId: string | null,
  fetcher: (client: CatnipBleClient) => Promise<T>,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<T> {
  const { fetchEnabled = true, ...fcuOptions } = options;
  const {
    client,
    status: connectionStatus,
    error: connectionError,
    ready,
    reconnect,
  } = useCatnipFcu(peripheralId, fcuOptions);

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const runFetch = useCallback(async () => {
    if (!client) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current(client);
      setData(result);
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!fetchEnabled || !ready || !client) {
      return;
    }
    void runFetch();
  }, [client, fetchEnabled, ready, runFetch]);

  const isConnecting = connectionStatus === 'connecting';
  const isLoading = isConnecting || loading;

  return {
    data,
    loading: isLoading,
    error: error ?? connectionError,
    refetch: runFetch,
    client,
    connectionStatus,
    ready,
    reconnect,
  };
}
