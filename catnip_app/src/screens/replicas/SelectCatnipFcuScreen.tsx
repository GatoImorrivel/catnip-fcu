import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Peripheral } from 'react-native-ble-manager';

import {
  BluetoothOffBlock,
  bluetoothOffBlockAction,
} from '@/components/BluetoothOffBlock';
import { useBluetoothGate } from '@/hooks/use-bluetooth-gate';
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
  const bluetoothGate = useBluetoothGate({ promptOnFocus: true });
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

  const displayError = connectError ?? error ?? bluetoothGate.enableError;

  const isConnecting = connectingId !== null;

  const handleRetryScan = useCallback(() => {
    setConnectError(null);
    void (async () => {
      const result = await bluetoothGate.requestEnable();
      if (result !== 'on') {
        return;
      }
      if (ready) {
        void startScan().catch(() => undefined);
      }
    })();
  }, [bluetoothGate, ready, startScan]);

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

      {bluetoothGate.blocked ? (
        <BluetoothOffBlock
          message={
            bluetoothGate.bluetoothUnavailableMessage ?? 'Bluetooth is not available.'
          }
          subtitle={bluetoothGate.bluetoothOffSubtitle}
          actionLabel={bluetoothGate.bluetoothActionLabel}
          onAction={bluetoothOffBlockAction(
            bluetoothGate.bluetoothState,
            bluetoothGate.requestEnable,
            bluetoothGate.openSettings,
          )}
        />
      ) : null}

      {displayError && !bluetoothGate.blocked ? (
        <View style={styles.errorBlock}>
          <Text style={[styles.error, { color: theme.colors.error }]}>{displayError}</Text>
          <Pressable
            onPress={handleRetryScan}
            accessibilityRole="button"
            accessibilityLabel={bluetoothGate.bluetoothActionLabel}
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          >
            <Text style={[styles.retryLabel, { color: theme.colors.foreground }]}>
              {bluetoothGate.bluetoothActionLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!bluetoothGate.blocked && (isScanning || !ready) ? (
        <View style={styles.scanningRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.muted }}>
            {ready ? 'Scanning for FCUs…' : 'Starting Bluetooth…'}
          </Text>
        </View>
      ) : null}

      {!bluetoothGate.blocked ? (
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
      ) : null}
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
