import { useCallback, useEffect, useRef, useState } from 'react';

import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import {
  acquireFcuSession,
  getFcuSessionSnapshot,
  reconnectFcuSession,
  releaseFcuSession,
  subscribeFcuSession,
  subscribeFcuSessionEvents,
  type FcuSessionStatus,
} from '@/lib/fcu-connection-session';
import type { FCUToHostEvent } from '@/messages/types';
import { useBleManager } from './use-ble-manager';

export type CatnipFcuStatus = FcuSessionStatus;

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

    const syncFromSession = () => {
      const snapshot = getFcuSessionSnapshot(mac);
      setStatus(snapshot.status);
      setClient(snapshot.client);
      setError(snapshot.error);
    };

    syncFromSession();

    const unsubscribeSession = subscribeFcuSession(mac, syncFromSession);
    const unsubscribeEvents = subscribeFcuSessionEvents(mac, (event) => {
      setLastEvent(event);
      onEventRef.current?.(event);
    });

    acquireFcuSession(mac);

    return () => {
      unsubscribeSession();
      unsubscribeEvents();
      releaseFcuSession(mac);
    };
  }, [enabled, peripheralId]);

  useEffect(() => {
    if (!enabled || !peripheralId || connectAttempt === 0) {
      return;
    }
    reconnectFcuSession(peripheralId);
  }, [connectAttempt, enabled, peripheralId]);

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
