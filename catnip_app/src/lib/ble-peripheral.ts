import type { Peripheral } from 'react-native-ble-manager';

export function getPeripheralLabel(peripheral: Peripheral): string {
  return peripheral.name ?? peripheral.advertising.localName ?? 'Unknown';
}
