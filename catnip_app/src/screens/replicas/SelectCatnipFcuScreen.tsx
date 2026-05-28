import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BleState } from 'react-native-ble-manager';
import type { Peripheral } from 'react-native-ble-manager';

import { useBleManager } from '@/hooks/use-ble-manager';
import { useBleScan } from '@/hooks/use-ble-scan';
import { useTheme } from '@/hooks/use-theme';
import { getPeripheralLabel } from '@/lib/ble-peripheral';
import {
  prepareReplicaCreationFcu,
  releaseReplicaCreationSession,
} from '@/lib/fcu-connection-session';
import { Screen } from '@/screens/components';

export function SelectCatnipFcuScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { bluetoothState, isBluetoothUnauthorized } = useBleManager();
  const { devices, isScanning, error, ready, isBluetoothOn, startScan, stopScan } =
    useBleScan();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!ready || !isBluetoothOn) {
        return;
      }

      void startScan().catch(() => undefined);

      return () => {
        void stopScan().catch(() => undefined);
      };
    }, [isBluetoothOn, ready, startScan, stopScan]),
  );

  const handleSelect = useCallback(
    async (device: Peripheral) => {
      setConnectError(null);
      setConnectingId(device.id);

      try {
        await stopScan().catch(() => undefined);
        const characteristics = await prepareReplicaCreationFcu(device.id);

        router.push({
          pathname: '/replicas/new',
          params: {
            bluetoothMac: device.id,
            fcuName: getPeripheralLabel(device),
            fcuCompatibilityId: characteristics.compatibility_id,
          },
        });
      } catch (err: unknown) {
        releaseReplicaCreationSession();
        setConnectError(err instanceof Error ? err.message : String(err));
      } finally {
        setConnectingId(null);
      }
    },
    [router, stopScan],
  );

  const displayError =
    connectError ??
    error ??
    (!isBluetoothOn && ready && bluetoothState === BleState.Unauthorized
      ? 'Bluetooth permission denied. Enable access in Settings to scan.'
      : !isBluetoothOn && ready
        ? 'Turn on Bluetooth to scan.'
        : null);

  const isConnecting = connectingId !== null;

  const handleRetryScan = useCallback(() => {
    setConnectError(null);
    if (isBluetoothUnauthorized) {
      void Linking.openSettings();
      return;
    }
    if (ready && isBluetoothOn) {
      void startScan().catch(() => undefined);
    }
  }, [isBluetoothOn, isBluetoothUnauthorized, ready, startScan]);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>Pair FCU</Text>
      </View>

      <Text style={[styles.hint, { color: theme.colors.muted }]}>
        Choose a nearby Catnip FCU to pair with this replica.
      </Text>

      {displayError ? (
        <View style={styles.errorBlock}>
          <Text style={[styles.error, { color: theme.colors.error }]}>{displayError}</Text>
          <Pressable
            onPress={handleRetryScan}
            accessibilityRole="button"
            accessibilityLabel={
              isBluetoothUnauthorized ? 'Open app settings' : 'Retry scan'
            }
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <Text style={[styles.retryLabel, { color: theme.colors.foreground }]}>
              {isBluetoothUnauthorized ? 'Open Settings' : 'Retry'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isScanning || !ready ? (
        <View style={styles.scanningRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.muted }}>
            {ready ? 'Scanning for FCUs…' : 'Starting Bluetooth…'}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={devices.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          !isScanning && ready ? (
            <Text style={[styles.empty, { color: theme.colors.muted }]}>
              No Catnip FCUs found yet.
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const busy = connectingId === item.id && isConnecting;

          return (
            <Pressable
              onPress={() => void handleSelect(item)}
              disabled={isConnecting}
              style={({ pressed }) => [
                styles.deviceRow,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                  opacity: pressed || busy ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.deviceName, { color: theme.colors.foreground, flex: 1 }]}>
                {getPeripheralLabel(item)}
              </Text>
              {busy ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.muted}
                />
              )}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  hint: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 12,
  },
  errorBlock: {
    gap: 8,
    marginBottom: 8,
  },
  error: {
    fontSize: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    fontSize: 15,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
