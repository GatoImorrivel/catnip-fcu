import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { BleState } from 'react-native-ble-manager';

import { getBluetoothUnavailableMessage } from '@/lib/bluetooth-messages';
import { refreshBluetoothState } from '@/lib/request-bluetooth-enabled';
import { BleManager, ensureBleManagerStarted } from '../lib/ble-manager';

export { getBluetoothUnavailableMessage } from '@/lib/bluetooth-messages';
export {
  getBluetoothActionLabel,
  getBluetoothOffSubtitle,
} from '@/lib/bluetooth-messages';

export type UseBleManagerResult = {
  ready: boolean;
  bluetoothState: BleState;
  isBluetoothOn: boolean;
  isBluetoothUnauthorized: boolean;
  bluetoothUnavailableMessage: string | null;
  error: string | null;
};

export function useBleManager(): UseBleManagerResult {
  const [ready, setReady] = useState(false);
  const [bluetoothState, setBluetoothState] = useState<BleState>(BleState.Unknown);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const stateSubscription = BleManager.onDidUpdateState((event) => {
      if (active) {
        setBluetoothState(event.state);
      }
    });

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active' || !active) {
        return;
      }
      void refreshBluetoothState().then((state) => {
        if (active) {
          setBluetoothState(state);
        }
      });
    };

    const appStateSubscription = AppState.addEventListener('change', onAppStateChange);

    ensureBleManagerStarted()
      .then(() => BleManager.checkState())
      .then((state) => {
        if (!active) {
          return;
        }
        setBluetoothState(state);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      active = false;
      stateSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const isBluetoothUnauthorized = bluetoothState === BleState.Unauthorized;

  return {
    ready,
    bluetoothState,
    isBluetoothOn: bluetoothState === BleState.On,
    isBluetoothUnauthorized,
    bluetoothUnavailableMessage: getBluetoothUnavailableMessage(bluetoothState),
    error,
  };
}
