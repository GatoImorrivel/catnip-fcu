import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LiveFireSelectorPanel } from '@/components/fire-selector/LiveFireSelectorPanel';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import {
  assertReplicaType,
  parseSelectorPositionMapping,
  type ReplicaType,
  type SelectorPositionMappingEntry,
} from '@/replicas';
import { Screen } from '@/screens/components';

export function ReplicaDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const replicaId = typeof id === 'string' ? id : '';
  const { get } = useReplicas();

  const [replicaName, setReplicaName] = useState('');
  const [peripheralId, setPeripheralId] = useState<string | null>(null);
  const [replicaType, setReplicaType] = useState<ReplicaType | null>(null);
  const [selectorPositionMapping, setSelectorPositionMapping] = useState<
    SelectorPositionMappingEntry[]
  >([]);
  const [replicaError, setReplicaError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
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
            setReplicaType(null);
            return;
          }
          setReplicaName(replica.name);
          setPeripheralId(replica.bluetoothMac);
          setReplicaType(assertReplicaType(replica.type));
          setSelectorPositionMapping(parseSelectorPositionMapping(replica));
          setReplicaError(null);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setReplicaError(err instanceof Error ? err.message : String(err));
            setPeripheralId(null);
            setReplicaType(null);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [get, replicaId]),
  );

  const hasMapping = selectorPositionMapping.length > 0;
  const graphicSize = replicaType === 'M4' ? 220 : 180;

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
        <Text
          style={[styles.title, { color: theme.colors.foreground }]}
          numberOfLines={1}
        >
          {replicaName || 'Replica'}
        </Text>
      </View>

      {replicaError ? (
        <Text style={[styles.error, { color: theme.colors.primary }]}>{replicaError}</Text>
      ) : null}

      <View style={styles.selectorSection}>
        {hasMapping && replicaType && peripheralId ? (
          <LiveFireSelectorPanel
            replicaType={replicaType}
            peripheralId={peripheralId}
            mapping={selectorPositionMapping}
            graphicSize={graphicSize}
            captionMode="fireMode"
          />
        ) : (
          <View style={styles.emptyMapping}>
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              Fire selector mapping is not configured
            </Text>
            <Text style={[styles.emptyHint, { color: theme.colors.muted }]}>
              Map each switch position to your FCU so the selector graphic can follow your
              replica in real time.
            </Text>
            {replicaId ? (
              <Pressable
                onPress={() => router.push(`/replicas/${replicaId}/map-selector`)}
                style={({ pressed }) => [
                  styles.configureButton,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.configureButtonLabel,
                    { color: theme.colors.primaryForeground },
                  ]}
                >
                  Configure mapping
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
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
  error: {
    fontSize: 14,
    marginBottom: 8,
  },
  selectorSection: {
    flex: 1,
    minHeight: 240,
  },
  emptyMapping: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  configureButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  configureButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
