import { useCallback, useEffect, useRef, useState } from 'react';

import { CatnipBleClient } from '@/lib/catnip-ble-client';
import { BleManager, ensureBleManagerStarted } from '@/lib/ble-manager';
import type { FCUToHostEvent } from '@/messages/types';
import { useBleManager } from './use-ble-manager';

export type CatnipFcuStatus = 'idle' | 'connecting' | 'ready' | 'error';

export type UseCatnipFcuOptions = {
  /** When false, no connection is attempted. Defaults to true if `peripheralId` is set. */
  enabled?: boolean;
  /** Called for FCU push events (fire mode change, trigger pull). */
  onEvent?: (event: FCUToHostEvent) => void;
};

export type UseCatnipFcuResult = {
  client: CatnipBleClient | null;
  status: CatnipFcuStatus;
  error: string | null;
  ready: boolean;
  isBluetoothOn: boolean;
  bleReady: boolean;
  lastEvent: FCUToHostEvent | null;
  /** Manually reconnect after an error or disconnect. */
  reconnect: () => void;
};

export function useCatnipFcu(
  peripheralId: string | null,
  options: UseCatnipFcuOptions = {},
): UseCatnipFcuResult {
  const { enabled: enabledOption, onEvent } = options;
  const { ready: bleReady, isBluetoothOn, error: managerError } = useBleManager();

  const [status, setStatus] = useState<CatnipFcuStatus>('idle');
  const [client, setClient] = useState<CatnipBleClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<FCUToHostEvent | null>(null);
  const [connectAttempt, setConnectAttempt] = useState(0);

  const clientRef = useRef<CatnipBleClient | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const enabled =
    (enabledOption ?? true) &&
    peripheralId !== null &&
    peripheralId.length > 0 &&
    bleReady &&
    isBluetoothOn;

  const reconnect = useCallback(() => {
    setConnectAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !peripheralId) {
      setStatus('idle');
      setClient(null);
      setError(null);
      return;
    }

    const mac = peripheralId;
    let cancelled = false;

    async function openSession() {
      setStatus('connecting');
      setError(null);
      setClient(null);

      try {
        await ensureBleManagerStarted();
        await BleManager.connect(mac);
        if (cancelled) {
          await BleManager.disconnect(mac).catch(() => undefined);
          return;
        }

        const fcuClient = await CatnipBleClient.connect(mac);
        if (cancelled) {
          await fcuClient.close();
          await BleManager.disconnect(mac).catch(() => undefined);
          return;
        }

        fcuClient.onEvent = (event) => {
          setLastEvent(event);
          onEventRef.current?.(event);
        };

        clientRef.current = fcuClient;
        setClient(fcuClient);
        setStatus('ready');
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }
        setStatus('error');
        setClient(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    void openSession();

    return () => {
      cancelled = true;
      const active = clientRef.current;
      clientRef.current = null;
      setClient(null);
      void active?.close();
      void BleManager.disconnect(mac).catch(() => undefined);
    };
  }, [enabled, peripheralId, connectAttempt]);

  const displayError =
    error ??
    managerError ??
    (!isBluetoothOn && bleReady ? 'Turn on Bluetooth to connect to the FCU.' : null);

  return {
    client,
    status,
    error: displayError,
    ready: status === 'ready' && client !== null,
    isBluetoothOn,
    bleReady,
    lastEvent,
    reconnect,
  };
}
