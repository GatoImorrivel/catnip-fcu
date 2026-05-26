import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFcuCharacteristics } from '@/hooks/use-fcu-characteristics';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import { useFcuSupportedFireModes } from '@/hooks/use-fcu-fire-mode';
import type { Characteristics } from '@/messages/types';
import { formatFireModeName } from '@/messages/types';
import { Screen } from '@/screens/components';

function formatFcuKind(kind: Characteristics['kind']): string {
  if (kind.tag === 'AEG') {
    return 'AEG';
  }
  return `HPA (${kind.num_solenoids} solenoids)`;
}

function formatCharacteristics(chars: Characteristics, supportedModes: string[]): string {
  const modes = supportedModes.map(formatFireModeName).join(', ');

  return [
    `FCU name: ${chars.name}`,
    `Kind: ${formatFcuKind(chars.kind)}`,
    `Fire positions: ${chars.num_fire_positions}`,
    `Supported fire modes: ${modes}`,
  ].join('\n');
}

function connectionStatusLabel(
  connectionStatus: string,
  loading: boolean,
): string | null {
  if (loading && connectionStatus === 'connecting') {
    return 'Connecting to FCU…';
  }
  if (loading) {
    return 'Fetching characteristics…';
  }
  return null;
}

export function ReplicaDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const replicaId = typeof id === 'string' ? id : '';
  const { get } = useReplicas();

  const [replicaName, setReplicaName] = useState('');
  const [fcuName, setFcuName] = useState('');
  const [peripheralId, setPeripheralId] = useState<string | null>(null);
  const [replicaError, setReplicaError] = useState<string | null>(null);

  useEffect(() => {
    if (!replicaId) {
      setReplicaError('Missing replica id');
      setPeripheralId(null);
      return;
    }

    let cancelled = false;

    void get(replicaId)
      .then((replica) => {
        if (cancelled) {
          return;
        }
        if (!replica) {
          setReplicaError('Replica not found');
          setPeripheralId(null);
          return;
        }
        setReplicaName(replica.name);
        setFcuName(replica.fcuName?.trim() || 'Unknown FCU');
        setPeripheralId(replica.bluetoothMac);
        setReplicaError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReplicaError(err instanceof Error ? err.message : String(err));
          setPeripheralId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [get, replicaId]);

  const {
    characteristics,
    loading,
    error: fcuError,
    connectionStatus,
    reconnect,
  } = useFcuCharacteristics(peripheralId, { enabled: peripheralId !== null });

  const { data: supportedFireModes } = useFcuSupportedFireModes(peripheralId, {
    enabled: peripheralId !== null && characteristics !== null,
  });

  const error = replicaError ?? fcuError;
  const statusLabel = connectionStatusLabel(connectionStatus, loading);

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
        <Text
          style={[styles.title, { color: theme.colors.foreground }]}
          numberOfLines={1}
        >
          {replicaName || 'Replica'}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
        Placeholder — FCU characteristics
      </Text>

      {fcuName ? (
        <Text style={[styles.fcuName, { color: theme.colors.muted }]}>{fcuName}</Text>
      ) : null}

      {error ? (
        <View style={styles.errorBlock}>
          <Text style={[styles.error, { color: theme.colors.primary }]}>{error}</Text>
          {fcuError && peripheralId ? (
            <Pressable
              onPress={() => reconnect()}
              accessibilityRole="button"
              accessibilityLabel="Retry FCU connection"
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            >
              <Text style={[styles.retryLabel, { color: theme.colors.foreground }]}>
                Retry
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {statusLabel ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.muted }]}>
            {statusLabel}
          </Text>
        </View>
      ) : null}

      {characteristics && !loading ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            Characteristics
          </Text>
          <Text style={[styles.characteristics, { color: theme.colors.foreground }]}>
            {formatCharacteristics(characteristics, supportedFireModes ?? [])}
          </Text>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 4,
  },
  fcuName: {
    fontSize: 15,
    marginBottom: 16,
  },
  errorBlock: {
    gap: 8,
    marginBottom: 12,
  },
  error: {
    fontSize: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 15,
  },
  body: {
    flex: 1,
    marginTop: 8,
  },
  bodyContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  characteristics: {
    fontSize: 15,
    lineHeight: 22,
  },
});
