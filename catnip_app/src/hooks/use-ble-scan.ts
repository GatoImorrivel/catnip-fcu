import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Peripheral, ScanOptions } from 'react-native-ble-manager';

import {
  DEFAULT_CATNIP_SCAN_OPTIONS,
  isCatnipFcuPeripheral,
} from '../constants/ble';
import { ensureBleScanPermissions } from '../lib/ble-permissions';
import { BleManager } from '../lib/ble-manager';
import { useBleManager } from './use-ble-manager';

export type UseBleScanOptions = {
  /** When false, discovered devices are not filtered to Catnip FCUs. Default true. */
  filterCatnip?: boolean;
  /** Scan options passed to `BleManager.scan`. Catnip filters apply when `filterCatnip` is true. */
  scanOptions?: ScanOptions;
};

export type UseBleScanResult = {
  devices: Peripheral[];
  isScanning: boolean;
  error: string | null;
  ready: boolean;
  isBluetoothOn: boolean;
  startScan: (options?: ScanOptions) => Promise<void>;
  stopScan: () => Promise<void>;
  clearDevices: () => void;
};

function sortByRssi(a: Peripheral, b: Peripheral): number {
  return b.rssi - a.rssi;
}

function mergePeripheral(
  previous: Map<string, Peripheral>,
  peripheral: Peripheral,
): Map<string, Peripheral> {
  const next = new Map(previous);
  const existing = next.get(peripheral.id);
  next.set(peripheral.id, existing ? { ...existing, ...peripheral } : peripheral);
  return next;
}

export function useBleScan(options: UseBleScanOptions = {}): UseBleScanResult {
  const { filterCatnip = true, scanOptions } = options;
  const { ready, isBluetoothOn, bluetoothUnavailableMessage, error: managerError } =
    useBleManager();
  const [devicesById, setDevicesById] = useState<Map<string, Peripheral>>(
    () => new Map(),
  );
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    const discoverSubscription = BleManager.onDiscoverPeripheral((peripheral) => {
      if (filterCatnip && !isCatnipFcuPeripheral(peripheral)) {
        return;
      }

      setDevicesById((current) => mergePeripheral(current, peripheral));
    });

    const stopSubscription = BleManager.onStopScan(() => {
      isScanningRef.current = false;
      setIsScanning(false);
    });

    return () => {
      discoverSubscription.remove();
      stopSubscription.remove();
      if (isScanningRef.current) {
        void BleManager.stopScan().catch(() => undefined);
      }
    };
  }, [filterCatnip]);

  const devices = useMemo(
    () => [...devicesById.values()].sort(sortByRssi),
    [devicesById],
  );

  const clearDevices = useCallback(() => {
    setDevicesById(new Map());
  }, []);

  const stopScan = useCallback(async () => {
    if (!isScanningRef.current) {
      return;
    }

    try {
      await BleManager.stopScan();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  }, []);

  const startScan = useCallback(
    async (overrideOptions?: ScanOptions) => {
      if (!ready) {
        throw new Error('BLE manager is not ready');
      }
      if (!isBluetoothOn) {
        throw new Error(bluetoothUnavailableMessage ?? 'Bluetooth is unavailable');
      }

      setError(null);
      clearDevices();

      const resolvedOptions = filterCatnip
        ? { ...DEFAULT_CATNIP_SCAN_OPTIONS, ...scanOptions, ...overrideOptions }
        : { ...scanOptions, ...overrideOptions };

      const permissionsGranted = await ensureBleScanPermissions();
      if (!permissionsGranted) {
        const message = 'Bluetooth scan permission denied';
        setError(message);
        throw new Error(message);
      }

      if (isScanningRef.current) {
        await stopScan();
      }

      try {
        await BleManager.scan(resolvedOptions);
        isScanningRef.current = true;
        setIsScanning(true);
      } catch (err: unknown) {
        isScanningRef.current = false;
        setIsScanning(false);
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      }
    },
    [bluetoothUnavailableMessage, clearDevices, filterCatnip, isBluetoothOn, ready, scanOptions, stopScan],
  );

  return {
    devices,
    isScanning,
    error: error ?? managerError,
    ready,
    isBluetoothOn,
    startScan,
    stopScan,
    clearDevices,
  };
}
