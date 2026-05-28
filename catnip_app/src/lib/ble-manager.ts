import { Platform } from 'react-native';
import BleManager from 'react-native-ble-manager';

let startPromise: Promise<void> | null = null;

/** Initializes the native BLE module once per app session. */
export function ensureBleManagerStarted(): Promise<void> {
  if (!startPromise) {
    startPromise = BleManager.start({ showAlert: Platform.OS === 'ios' }).catch((error: unknown) => {
      startPromise = null;
      throw error;
    });
  }

  return startPromise;
}

export { BleManager };
