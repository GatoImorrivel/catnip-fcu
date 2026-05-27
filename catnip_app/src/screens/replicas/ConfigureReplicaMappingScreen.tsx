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

import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import type { FireSelectorSlotId } from '@/replicas/fire-selector-layout';
import {
  assertReplicaType,
  parseSelectorPositionMapping,
  type ReplicaType,
  type SelectorPositionMappingEntry,
} from '@/replicas';
import type { WeaponMetadataValues } from '@/replicas/weapon-metadata';
import { Screen } from '@/screens/components';
import {
  FireSelectorMappingStep,
  isFireSelectorMappingStepComplete,
} from '@/screens/replicas/FireSelectorMappingStep';
import { FireSelectorVerifyStep } from '@/screens/replicas/FireSelectorVerifyStep';

type ConfigureStep = 'mapSelector' | 'verifyMapping';

function weaponMetadataFromReplica(
  replica: Record<string, unknown>,
  type: ReplicaType,
): WeaponMetadataValues {
  if (type !== 'M4') {
    return {};
  }

  const positions = replica.fireSelectorPositions;
  if (positions === 3 || positions === 4) {
    return { fireSelectorPositions: positions };
  }

  return { fireSelectorPositions: 4 };
}

export function ConfigureReplicaMappingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const replicaId = typeof id === 'string' ? id : '';
  const { theme } = useTheme();
  const { get, update } = useReplicas();

  const [step, setStep] = useState<ConfigureStep>('mapSelector');
  const [replicaType, setReplicaType] = useState<ReplicaType | null>(null);
  const [metadata, setMetadata] = useState<WeaponMetadataValues>({});
  const [peripheralId, setPeripheralId] = useState('');
  const [replicaName, setReplicaName] = useState('');
  const [selectedGunSlotIds, setSelectedGunSlotIds] = useState<FireSelectorSlotId[]>([]);
  const [selectorPositionMapping, setSelectorPositionMapping] = useState<
    SelectorPositionMappingEntry[]
  >([]);
  const [fcuNumPositions, setFcuNumPositions] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!replicaId) {
      setLoadError('Missing replica id');
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
          return;
        }

        const type = assertReplicaType(replica.type);
        const mac = replica.bluetoothMac?.trim() ?? '';
        if (!mac) {
          setLoadError('Replica has no paired FCU');
          return;
        }

        setReplicaType(type);
        setMetadata(weaponMetadataFromReplica(replica, type));
        setPeripheralId(mac);
        setReplicaName(replica.name);
        setSelectorPositionMapping(parseSelectorPositionMapping(replica));
        setSelectedGunSlotIds([]);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [get, replicaId]);

  const mappingStepComplete =
    replicaType !== null &&
    fcuNumPositions > 0 &&
    isFireSelectorMappingStepComplete(
      replicaType,
      metadata,
      fcuNumPositions,
      selectedGunSlotIds,
      selectorPositionMapping,
    );

  const handleContinueFromMapping = useCallback(() => {
    if (!mappingStepComplete) {
      return;
    }
    setStep('verifyMapping');
  }, [mappingStepComplete]);

  const handleSave = useCallback(async () => {
    if (!replicaId || !replicaType || !mappingStepComplete) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await update(replicaId, {
        selectorPositionMapping,
        ...metadata,
      });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [mappingStepComplete, metadata, replicaId, replicaType, router, selectorPositionMapping, update]);

  const handleBack = useCallback(() => {
    if (step === 'verifyMapping') {
      setStep('mapSelector');
      return;
    }
    router.back();
  }, [router, step]);

  const stepTitle = step === 'mapSelector' ? 'Map fire selector' : 'Verify mapping';

  if (loadError) {
    return (
      <Screen>
        <Text style={[styles.error, { color: theme.colors.primary }]}>{loadError}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: theme.colors.foreground, fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </Screen>
    );
  }

  if (!replicaType || !peripheralId) {
    return (
      <Screen style={styles.loadingScreen}>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }

  const bodyIsFlex = step === 'verifyMapping';

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={1}>
          {replicaName || 'Configure mapping'}
        </Text>
      </View>

      <Text style={[styles.stepTitle, { color: theme.colors.foreground }]}>{stepTitle}</Text>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, bodyIsFlex && styles.bodyContentFlex]}
      >
        {step === 'mapSelector' ? (
          <FireSelectorMappingStep
            replicaType={replicaType}
            metadata={metadata}
            peripheralId={peripheralId}
            selectedGunSlotIds={selectedGunSlotIds}
            mapping={selectorPositionMapping}
            onSelectedGunSlotsChange={setSelectedGunSlotIds}
            onMappingChange={setSelectorPositionMapping}
            onFcuNumPositionsChange={setFcuNumPositions}
          />
        ) : null}

        {step === 'verifyMapping' ? (
          <FireSelectorVerifyStep
            replicaType={replicaType}
            peripheralId={peripheralId}
            mapping={selectorPositionMapping}
          />
        ) : null}

        {error ? <Text style={[styles.error, { color: theme.colors.primary }]}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'mapSelector' ? (
          <Pressable
            onPress={handleContinueFromMapping}
            disabled={!mappingStepComplete}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed || !mappingStepComplete ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryButtonLabel, { color: theme.colors.primaryForeground }]}>
              Continue
            </Text>
          </Pressable>
        ) : null}

        {step === 'verifyMapping' ? (
          <View style={styles.footerRow}>
            <Pressable
              onPress={() => setStep('mapSelector')}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.secondaryButtonLabel, { color: theme.colors.foreground }]}>
                Go Back
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              disabled={saving || !mappingStepComplete}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.footerPrimaryHalf,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed || saving || !mappingStepComplete ? 0.6 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <Text style={[styles.primaryButtonLabel, { color: theme.colors.primaryForeground }]}>
                  Save mapping
                </Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  loadingScreen: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 16,
  },
  bodyContentFlex: {
    flexGrow: 1,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 48,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerPrimaryHalf: {
    flex: 1,
  },
  error: {
    fontSize: 14,
    marginTop: 12,
  },
});
