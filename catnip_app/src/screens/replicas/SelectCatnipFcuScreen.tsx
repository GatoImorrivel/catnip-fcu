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
        await prepareReplicaCreationFcu(device.id);

        router.push({
          pathname: '/replicas/new',
          params: { bluetoothMac: device.id, fcuName: getPeripheralLabel(device) },
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
    connectError ?? error ?? (!isBluetoothOn && ready ? 'Turn on Bluetooth to scan.' : null);

  const isConnecting = connectingId !== null;

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
        <Text style={[styles.error, { color: theme.colors.primary }]}>{displayError}</Text>
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
              <View style={styles.deviceText}>
                <Text style={[styles.deviceName, { color: theme.colors.foreground }]}>
                  {getPeripheralLabel(item)}
                </Text>
                <Text style={[styles.deviceId, { color: theme.colors.muted }]}>{item.id}</Text>
              </View>
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
  error: {
    fontSize: 14,
    marginBottom: 8,
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
  deviceText: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceId: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
