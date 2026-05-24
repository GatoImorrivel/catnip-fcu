import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectOptions, Peripheral, PeripheralInfo } from 'react-native-ble-manager';

import { CATNIP_FCU_SERVICE_UUID } from '../constants/ble';
import { BleManager } from '../lib/ble-manager';
import { useBleManager } from './use-ble-manager';

export type BleConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting';

export type UseBleConnectOptions = {
  connectOptions?: ConnectOptions;
};

export type UseBleConnectResult = {
  peripheral: Peripheral | null;
  peripheralInfo: PeripheralInfo | null;
  status: BleConnectionStatus;
  error: string | null;
  ready: boolean;
  isBluetoothOn: boolean;
  isConnected: boolean;
  connect: (device: Peripheral) => Promise<PeripheralInfo>;
  disconnect: () => Promise<void>;
};

export function useBleConnect(
  options: UseBleConnectOptions = {},
): UseBleConnectResult {
  const { connectOptions } = options;
  const { ready, isBluetoothOn, error: managerError } = useBleManager();
  const [peripheral, setPeripheral] = useState<Peripheral | null>(null);
  const [peripheralInfo, setPeripheralInfo] = useState<PeripheralInfo | null>(null);
  const [status, setStatus] = useState<BleConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const peripheralIdRef = useRef<string | null>(null);

  useEffect(() => {
    peripheralIdRef.current = peripheral?.id ?? null;
  }, [peripheral?.id]);

  useEffect(() => {
    const connectSubscription = BleManager.onConnectPeripheral((event) => {
      if (peripheralIdRef.current === event.peripheral) {
        setStatus('connected');
      }
    });

    const disconnectSubscription = BleManager.onDisconnectPeripheral((event) => {
      if (peripheralIdRef.current !== event.peripheral) {
        return;
      }

      peripheralIdRef.current = null;
      setPeripheral(null);
      setPeripheralInfo(null);
      setStatus('disconnected');
    });

    return () => {
      connectSubscription.remove();
      disconnectSubscription.remove();
    };
  }, []);

  const disconnect = useCallback(async () => {
    const id = peripheralIdRef.current;
    if (!id) {
      return;
    }

    setError(null);
    setStatus('disconnecting');

    try {
      await BleManager.disconnect(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      peripheralIdRef.current = null;
      setPeripheral(null);
      setPeripheralInfo(null);
      setStatus('disconnected');
    }
  }, []);

  const connect = useCallback(
    async (device: Peripheral) => {
      if (!ready) {
        throw new Error('BLE manager is not ready');
      }
      if (!isBluetoothOn) {
        throw new Error('Bluetooth is off');
      }

      if (peripheralIdRef.current && peripheralIdRef.current !== device.id) {
        await disconnect();
      }

      setError(null);
      setStatus('connecting');
      peripheralIdRef.current = device.id;
      setPeripheral(device);

      try {
        await BleManager.stopScan().catch(() => undefined);
        await BleManager.connect(device.id, connectOptions);
        const info = await BleManager.retrieveServices(device.id, [
          CATNIP_FCU_SERVICE_UUID,
        ]);
        setPeripheralInfo(info);
        setStatus('connected');
        return info;
      } catch (err: unknown) {
        peripheralIdRef.current = null;
        setPeripheral(null);
        setPeripheralInfo(null);
        setStatus('disconnected');
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      }
    },
    [connectOptions, disconnect, isBluetoothOn, ready],
  );

  return {
    peripheral,
    peripheralInfo,
    status,
    error: error ?? managerError,
    ready,
    isBluetoothOn,
    isConnected: status === 'connected',
    connect,
    disconnect,
  };
}
