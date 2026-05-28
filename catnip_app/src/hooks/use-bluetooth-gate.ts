import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BleState } from 'react-native-ble-manager';

import {
  getBluetoothActionLabel,
  getBluetoothOffSubtitle,
} from '@/lib/bluetooth-messages';
import {
  getBluetoothEnableErrorMessage,
  openBluetoothSettings,
  requestBluetoothEnabled,
  type BluetoothEnableResult,
} from '@/lib/request-bluetooth-enabled';

import { useBleManager } from './use-ble-manager';

export type UseBluetoothGateOptions = {
  /** When false, skips the once-per-focus enable prompt. Defaults to true. */
  promptOnFocus?: boolean;
};

export type UseBluetoothGateResult = {
  ready: boolean;
  bluetoothState: BleState;
  blocked: boolean;
  isBluetoothOn: boolean;
  isBluetoothUnauthorized: boolean;
  bluetoothUnavailableMessage: string | null;
  bluetoothOffSubtitle: string | null;
  bluetoothActionLabel: string;
  managerError: string | null;
  enableError: string | null;
  requestEnable: () => Promise<BluetoothEnableResult>;
  openSettings: () => Promise<void>;
};

export function useBluetoothGate(
  options: UseBluetoothGateOptions = {},
): UseBluetoothGateResult {
  const { promptOnFocus = true } = options;
  const {
    ready,
    bluetoothState,
    isBluetoothOn,
    isBluetoothUnauthorized,
    bluetoothUnavailableMessage,
    error: managerError,
  } = useBleManager();

  const [enableError, setEnableError] = useState<string | null>(null);
  const promptedThisFocusRef = useRef(false);

  const blocked = ready && !isBluetoothOn;

  const requestEnable = useCallback(async (): Promise<BluetoothEnableResult> => {
    if (bluetoothState === BleState.Unauthorized) {
      await openBluetoothSettings();
      setEnableError(getBluetoothEnableErrorMessage('denied'));
      return 'denied';
    }

    const result = await requestBluetoothEnabled();
    setEnableError(getBluetoothEnableErrorMessage(result));
    return result;
  }, [bluetoothState]);

  const openSettings = useCallback(async () => {
    await openBluetoothSettings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      promptedThisFocusRef.current = false;

      return () => {
        promptedThisFocusRef.current = false;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!promptOnFocus || !blocked || promptedThisFocusRef.current) {
        return;
      }

      promptedThisFocusRef.current = true;
      void requestEnable();
    }, [blocked, promptOnFocus, requestEnable]),
  );

  return {
    ready,
    bluetoothState,
    blocked,
    isBluetoothOn,
    isBluetoothUnauthorized,
    bluetoothUnavailableMessage,
    bluetoothOffSubtitle: getBluetoothOffSubtitle(bluetoothState),
    bluetoothActionLabel: getBluetoothActionLabel(bluetoothState),
    managerError,
    enableError,
    requestEnable,
    openSettings,
  };
}
