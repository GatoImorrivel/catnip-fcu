import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  BluetoothOffBlock,
  bluetoothOffBlockAction,
} from '@/components/BluetoothOffBlock';
import { useBluetoothGate } from '@/hooks/use-bluetooth-gate';
import { useFcuSupportedFireModes } from '@/hooks/use-fcu-fire-mode';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import { formatFireModeName } from '@/messages/types';
import { Screen } from '@/screens/components';

import { parseFcuPosition } from './parse-fcu-position';

export function NewProfileFireModeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id, fcuPosition: fcuPositionParam } = useLocalSearchParams<{
    id?: string;
    fcuPosition?: string;
  }>();
  const replicaId = typeof id === 'string' ? id : '';
  const fcuPosition = parseFcuPosition(
    typeof fcuPositionParam === 'string' ? fcuPositionParam : undefined,
  );

  const { get } = useReplicas();
  const bluetoothGate = useBluetoothGate({ promptOnFocus: true });
  const [peripheralId, setPeripheralId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    data: supportedModes,
    loading,
    error: modesError,
    connectionStatus,
    reconnect,
  } = useFcuSupportedFireModes(peripheralId, {
    fetchEnabled: peripheralId !== null,
  });

  useEffect(() => {
    if (!replicaId) {
      setLoadError('Missing replica id');
      return;
    }
    if (fcuPosition === null) {
      setLoadError('Missing selector position');
      return;
    }

    let cancelled = false;

    void get(replicaId)
      .then((replica) => {
        if (cancelled) {
          return;
        }
        if (!replica) {
          setLoadError('Replica not found');
          setPeripheralId(null);
          return;
        }
        setPeripheralId(replica.bluetoothMac);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
          setPeripheralId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fcuPosition, get, replicaId]);

  const handlePickFireMode = useCallback(
    (firemode: string) => {
      if (fcuPosition === null) {
        return;
      }
      router.push({
        pathname: '/replicas/[id]/new-profile/name',
        params: {
          id: replicaId,
          firemode,
          fcuPosition: String(fcuPosition),
        },
      });
    },
    [fcuPosition, replicaId, router],
  );

  const connectionMessage =
    !bluetoothGate.blocked && connectionStatus === 'connecting'
      ? 'Connecting to FCU…'
      : !bluetoothGate.blocked && loading
        ? 'Loading fire modes…'
        : null;

  const listError = loadError ?? modesError;
  const fireModes = supportedModes ?? [];

  return (
    <Screen style={styles.screen}>
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
        <Text style={[styles.title, { color: theme.colors.foreground }]}>New Profile +</Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
        Choose a fire mode for this profile.
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

      {listError && !bluetoothGate.blocked ? (
        <View style={styles.statusBlock}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{listError}</Text>
          {modesError && peripheralId ? (
            <Pressable onPress={reconnect} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.retryText, { color: theme.colors.foreground }]}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {connectionMessage ? (
        <View style={styles.statusBlock}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.statusText, { color: theme.colors.muted }]}>
            {connectionMessage}
          </Text>
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {!connectionMessage && !listError && fireModes.length === 0 ? (
          <Text style={[styles.emptyModes, { color: theme.colors.muted }]}>
            No fire modes reported by the FCU.
          </Text>
        ) : null}
        {fireModes.map((firemode) => (
          <Pressable
            key={firemode}
            onPress={() => handlePickFireMode(firemode)}
            disabled={fcuPosition === null}
            style={({ pressed }) => [
              styles.modeRow,
              { borderColor: theme.colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.modeLabel, { color: theme.colors.foreground }]}>
              {formatFireModeName(firemode)}
            </Text>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  statusBlock: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyModes: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
