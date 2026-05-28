import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { needsGunSlotSelection } from '@/replicas/fire-selector-layout';
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
  canContinueFireSelectorMappingStep,
  FireSelectorMappingStep,
  isFireSelectorMappingStepComplete,
  type FireSelectorMappingSubphase,
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
  const [mappingSubphase, setMappingSubphase] =
    useState<FireSelectorMappingSubphase>('pick');
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

  const slotPickRequired = useMemo(
    () =>
      replicaType !== null &&
      fcuNumPositions > 0 &&
      needsGunSlotSelection(replicaType, metadata, fcuNumPositions),
    [replicaType, metadata, fcuNumPositions],
  );

  const inMappingPickSubphase =
    step === 'mapSelector' && slotPickRequired && mappingSubphase === 'pick';

  const useFlexPickLayout = inMappingPickSubphase;

  const mappingFooterEnabled = useMemo(() => {
    if (replicaType === null) {
      return false;
    }

    return canContinueFireSelectorMappingStep(
      replicaType,
      metadata,
      fcuNumPositions,
      selectedGunSlotIds,
      selectorPositionMapping,
      mappingSubphase,
    );
  }, [
    replicaType,
    metadata,
    fcuNumPositions,
    selectedGunSlotIds,
    selectorPositionMapping,
    mappingSubphase,
  ]);

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
    if (!mappingFooterEnabled) {
      return;
    }

    if (inMappingPickSubphase) {
      setMappingSubphase('map');
      return;
    }

    if (!mappingStepComplete) {
      return;
    }

    setStep('verifyMapping');
  }, [inMappingPickSubphase, mappingFooterEnabled, mappingStepComplete]);

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
      setMappingSubphase('map');
      setStep('mapSelector');
      return;
    }
    router.back();
  }, [router, step]);

  const stepTitle = step === 'mapSelector' ? 'Map fire selector' : 'Verify mapping';

  const fireSelectorMappingStep =
    replicaType !== null ? (
      <FireSelectorMappingStep
        replicaType={replicaType}
        metadata={metadata}
        peripheralId={peripheralId}
        selectedGunSlotIds={selectedGunSlotIds}
        mapping={selectorPositionMapping}
        subphase={mappingSubphase}
        onSubphaseChange={setMappingSubphase}
        layout="fill"
        onSelectedGunSlotsChange={setSelectedGunSlotIds}
        onMappingChange={setSelectorPositionMapping}
        onFcuNumPositionsChange={setFcuNumPositions}
      />
    ) : null;

  if (loadError) {
    return (
      <Screen>
        <Text style={[styles.error, { color: theme.colors.error }]}>{loadError}</Text>
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

      {step === 'verifyMapping' ? (
        <View style={[styles.body, styles.bodyContentFlex]}>
          <FireSelectorVerifyStep
            replicaType={replicaType}
            peripheralId={peripheralId}
            mapping={selectorPositionMapping}
          />
          {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
        </View>
      ) : (
        <View style={[styles.body, styles.bodyContentFlex]}>
          {fireSelectorMappingStep}
          {error ? <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text> : null}
        </View>
      )}

      <View style={styles.footer}>
        {step === 'mapSelector' ? (
          <Pressable
            onPress={handleContinueFromMapping}
            disabled={!mappingFooterEnabled}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed || !mappingFooterEnabled ? 0.6 : 1,
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
              onPress={() => {
                setMappingSubphase('map');
                setStep('mapSelector');
              }}
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
