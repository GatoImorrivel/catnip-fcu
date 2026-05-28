import { Alert, Linking, Platform } from 'react-native';
import { BleState } from 'react-native-ble-manager';

import {
  BLUETOOTH_ENABLE_DECLINED_MESSAGE,
  getBluetoothUnavailableMessage,
} from '@/lib/bluetooth-messages';

import { BleManager, ensureBleManagerStarted } from './ble-manager';

export type BluetoothEnableResult = 'on' | 'denied' | 'unsupported';

export async function getBluetoothState(): Promise<BleState> {
  await ensureBleManagerStarted();
  return BleManager.checkState();
}

export async function openBluetoothSettings(): Promise<void> {
  await Linking.openSettings();
}

function showIosBluetoothOffAlert(): void {
  Alert.alert(
    'Bluetooth is off',
    'Turn on Bluetooth in Control Center or Settings, then return to Catnip.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          void openBluetoothSettings();
        },
      },
    ],
  );
}

async function promptForBluetoothOn(state: BleState): Promise<BluetoothEnableResult> {
  if (state === BleState.Unsupported) {
    return 'unsupported';
  }

  if (state === BleState.Unauthorized) {
    return 'denied';
  }

  if (state === BleState.On) {
    return 'on';
  }

  if (Platform.OS === 'android' && state === BleState.Off) {
    try {
      await BleManager.enableBluetooth();
    } catch {
      return 'denied';
    }
    const next = await BleManager.checkState();
    return next === BleState.On ? 'on' : 'denied';
  }

  if (Platform.OS === 'ios') {
    if (
      state === BleState.Off ||
      state === BleState.Unknown ||
      state === BleState.Resetting
    ) {
      showIosBluetoothOffAlert();
    }
    const next = await BleManager.checkState();
    return next === BleState.On ? 'on' : 'denied';
  }

  const next = await BleManager.checkState();
  return next === BleState.On ? 'on' : 'denied';
}

/**
 * Prompts the user to enable Bluetooth when needed. Returns whether the adapter is on afterward.
 */
export async function requestBluetoothEnabled(): Promise<BluetoothEnableResult> {
  const state = await getBluetoothState();
  return promptForBluetoothOn(state);
}

export function getBluetoothEnableErrorMessage(result: BluetoothEnableResult): string | null {
  if (result === 'on') {
    return null;
  }
  if (result === 'unsupported') {
    return getBluetoothUnavailableMessage(BleState.Unsupported) ?? 'Bluetooth is not supported.';
  }
  return BLUETOOTH_ENABLE_DECLINED_MESSAGE;
}

export async function refreshBluetoothState(): Promise<BleState> {
  return getBluetoothState();
}
