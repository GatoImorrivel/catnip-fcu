import { Platform } from 'react-native';
import { BleState } from 'react-native-ble-manager';

export type BluetoothPlatform = 'android' | 'ios';

export function getBluetoothPlatform(): BluetoothPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export function getBluetoothUnavailableMessage(
  state: BleState,
  platform: BluetoothPlatform = getBluetoothPlatform(),
): string | null {
  if (state === BleState.Unsupported) {
    return 'Bluetooth is not supported on this device.';
  }
  if (state === BleState.Unauthorized) {
    return 'Bluetooth permission denied. Enable Bluetooth access for this app in Settings.';
  }
  if (state === BleState.Off) {
    if (platform === 'ios') {
      return 'Turn on Bluetooth in Control Center or Settings to connect to the FCU.';
    }
    return 'Turn on Bluetooth to connect to the FCU.';
  }
  if (state === BleState.Resetting) {
    return 'Bluetooth is restarting. Try again in a moment.';
  }
  if (state === BleState.Unknown) {
    return 'Bluetooth is unavailable. Try again in a moment.';
  }
  return null;
}

export function getBluetoothOffSubtitle(
  state: BleState,
  platform: BluetoothPlatform = getBluetoothPlatform(),
): string | null {
  if (state === BleState.Off && platform === 'ios') {
    return 'You can also enable Bluetooth from Control Center.';
  }
  return null;
}

export function getBluetoothActionLabel(
  state: BleState,
  platform: BluetoothPlatform = getBluetoothPlatform(),
): string {
  if (state === BleState.Unauthorized) {
    return 'Open Settings';
  }
  if (state === BleState.Off) {
    return platform === 'android' ? 'Turn on Bluetooth' : 'Open Settings';
  }
  return 'Retry';
}

export const BLUETOOTH_ENABLE_DECLINED_MESSAGE =
  'Bluetooth is required to connect to the FCU.';
