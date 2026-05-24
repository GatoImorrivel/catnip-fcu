import { Platform } from 'react-native';

import { BleManager, ensureBleManagerStarted } from './ble-manager';

async function tryDisconnect(peripheralId: string): Promise<void> {
  const connected = await BleManager.isPeripheralConnected(peripheralId).catch(() => false);
  if (!connected) {
    return;
  }

  await BleManager.disconnect(peripheralId);
}

async function tryRemoveBond(peripheralId: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await BleManager.removeBond(peripheralId);
  } catch {
    // Not bonded or already removed.
  }
}

async function tryRemovePeripheral(peripheralId: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await BleManager.removePeripheral(peripheralId);
  } catch {
    // Peripheral may already be gone from the native cache.
  }
}

/** Disconnect and unpair a bound FCU so it can advertise again without a reboot. */
export async function unpairFcu(peripheralId: string): Promise<void> {
  const id = peripheralId.trim();
  if (!id) {
    return;
  }

  await ensureBleManagerStarted();
  await tryDisconnect(id);
  await tryRemoveBond(id);
  await tryRemovePeripheral(id);
}
