import { useEffect, useState } from 'react';
import { BleState } from 'react-native-ble-manager';

import { BleManager, ensureBleManagerStarted } from '../lib/ble-manager';

export function getBluetoothUnavailableMessage(state: BleState): string | null {
  if (state === BleState.Unauthorized) {
    return 'Bluetooth permission denied. Enable Bluetooth access for this app in Settings.';
  }
  if (state === BleState.Off) {
    return 'Turn on Bluetooth to connect to the FCU.';
  }
  return null;
}

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
