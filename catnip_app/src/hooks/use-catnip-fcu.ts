import { useCallback, useEffect, useRef, useState } from 'react';

import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import {
  acquireFcuSession,
  getFcuSessionCharacteristicsError,
  getFcuSessionSnapshot,
  reconnectFcuSession,
  releaseFcuSession,
  subscribeFcuSession,
  subscribeFcuSessionEvents,
  type FcuSessionStatus,
} from '@/lib/fcu-connection-session';
import {
  getBluetoothEnableErrorMessage,
  requestBluetoothEnabled,
} from '@/lib/request-bluetooth-enabled';
import type { FCUToHostEvent } from '@/messages/types';
import { useBleManager } from './use-ble-manager';

export type CatnipFcuStatus = FcuSessionStatus;

export type UseCatnipFcuOptions = {
  /** When false, no connection is attempted. Defaults to true if `peripheralId` is set. */
  enabled?: boolean;
  /**
   * When false, only subscribes to an existing session (no acquire/release).
   * Use after {@link retainReplicaCreationSession} on the create-replica flow.
   */
  manageConnection?: boolean;
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
  bluetoothBlocked: boolean;
  lastEvent: FCUToHostEvent | null;
  /** Manually reconnect after an error or disconnect. */
  reconnect: () => void;
};

export function useCatnipFcu(
  peripheralId: string | null,
  options: UseCatnipFcuOptions = {},
): UseCatnipFcuResult {
  const { enabled: enabledOption, manageConnection = true, onEvent } = options;
  const {
    ready: bleReady,
    isBluetoothOn,
    bluetoothUnavailableMessage,
    error: managerError,
  } = useBleManager();

  const [status, setStatus] = useState<CatnipFcuStatus>('idle');
  const [client, setClient] = useState<CatnipBleClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<FCUToHostEvent | null>(null);
  const [connectAttempt, setConnectAttempt] = useState(0);
  const [characteristicsError, setCharacteristicsError] = useState<string | null>(null);
  const [enableError, setEnableError] = useState<string | null>(null);

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const bluetoothBlocked = bleReady && !isBluetoothOn;

  const enabled =
    (enabledOption ?? true) &&
    peripheralId !== null &&
    peripheralId.length > 0 &&
    bleReady &&
    isBluetoothOn;

  const reconnect = useCallback(() => {
    void (async () => {
      const result = await requestBluetoothEnabled();
      const message = getBluetoothEnableErrorMessage(result);
      setEnableError(message);
      if (result !== 'on') {
        return;
      }
      setConnectAttempt((n) => n + 1);
    })();
  }, []);

  useEffect(() => {
    setConnectAttempt(0);
    setEnableError(null);
  }, [peripheralId]);

  useEffect(() => {
    if (isBluetoothOn) {
      setEnableError(null);
    }
  }, [isBluetoothOn]);

  useEffect(() => {
    if (!enabled || !peripheralId) {
      setStatus('idle');
      setClient(null);
      setError(null);
      setCharacteristicsError(null);
      return;
    }

    const mac = peripheralId;

    const syncFromSession = () => {
      const snapshot = getFcuSessionSnapshot(mac);
      setStatus(snapshot.status);
      setClient(snapshot.client);
      setError(snapshot.error);
      setCharacteristicsError(
        snapshot.characteristicsError ?? getFcuSessionCharacteristicsError(mac),
      );
    };

    syncFromSession();

    const unsubscribeSession = subscribeFcuSession(mac, syncFromSession);
    const unsubscribeEvents = subscribeFcuSessionEvents(mac, (event) => {
      setLastEvent(event);
      onEventRef.current?.(event);
    });

    if (manageConnection) {
      acquireFcuSession(mac);
    }

    return () => {
      unsubscribeSession();
      unsubscribeEvents();
      if (manageConnection) {
        releaseFcuSession(mac);
      }
    };
  }, [enabled, manageConnection, peripheralId]);

  useEffect(() => {
    if (!enabled || !peripheralId || connectAttempt === 0) {
      return;
    }
    reconnectFcuSession(peripheralId);
  }, [connectAttempt, enabled, peripheralId]);

  const displayError =
    (bluetoothBlocked ? bluetoothUnavailableMessage : null) ??
    enableError ??
    error ??
    characteristicsError ??
    managerError;

  return {
    client,
    status,
    error: displayError,
    ready: status === 'ready' && client !== null,
    isBluetoothOn,
    bleReady,
    bluetoothBlocked,
    lastEvent,
    reconnect,
  };
}
