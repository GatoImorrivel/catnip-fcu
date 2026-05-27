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
  /**
   * Values that should trigger a new fetch when they change (e.g. `firemodeName`,
   * `position`). Pass the same request parameters your `fetcher` closes over.
   */
  refetchDeps?: readonly unknown[];
};

export type UseFcuRequestResult<T> = {
  data: T | null;
  /** True only for the initial connect/fetch (no cached `data` yet). */
  loading: boolean;
  /** True when re-fetching while previous `data` is still available. */
  isRefetching: boolean;
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
 * `client` becomes available (and on `refetch`). For parameterized requests, pass
 * those parameters in `refetchDeps` so a new fetch runs when they change.
 */
export function useFcuRequest<T>(
  peripheralId: string | null,
  fetcher: (client: CatnipBleClient) => Promise<T>,
  options: UseFcuRequestOptions = {},
): UseFcuRequestResult<T> {
  const { fetchEnabled = true, refetchDeps = [], ...fcuOptions } = options;
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
    setData(null);
    setError(null);
  }, [peripheralId]);

  useEffect(() => {
    if (!fetchEnabled || !ready || !client) {
      return;
    }
    void runFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetchDeps is intentional
  }, [client, fetchEnabled, ready, runFetch, ...refetchDeps]);

  const isConnecting = connectionStatus === 'connecting';
  const hasData = data !== null;
  const isInitialLoading = isConnecting || (loading && !hasData);
  const isRefetching = loading && hasData;

  return {
    data,
    loading: isInitialLoading,
    isRefetching,
    error: error ?? connectionError,
    refetch: runFetch,
    client,
    connectionStatus,
    ready,
    reconnect,
  };
}
