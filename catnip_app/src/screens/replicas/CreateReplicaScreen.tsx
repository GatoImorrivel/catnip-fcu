import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loadDefaultProfilesFromFcu } from '@/fcu-profiles';
import { useCreateReplicaFcu } from '@/hooks/use-create-replica-fcu';
import { useReplicas } from '@/hooks/use-replicas';
import { releaseReplicaCreationSession } from '@/lib/fcu-connection-session';
import { useTheme } from '@/hooks/use-theme';
import type { FCUToHostEvent } from '@/messages/types';
import { needsGunSlotSelection } from '@/replicas/fire-selector-layout';
import type { FireSelectorSlotId } from '@/replicas/fire-selector-layout';
import {
  getWeaponMetadataFields,
  hasWeaponMetadata,
  isWeaponMetadataComplete,
  type WeaponMetadataValues,
} from '@/replicas/weapon-metadata';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';
import { REPLICA_TYPES, type ReplicaType } from '@/replicas';
import { Dropdown } from '@/screens/components/Dropdown';
import { Screen } from '@/screens/components';
import {
  canContinueFireSelectorMappingStep,
  FireSelectorMappingStep,
  isFireSelectorMappingStepComplete,
  type FireSelectorMappingSubphase,
} from '@/screens/replicas/FireSelectorMappingStep';
import { FireSelectorVerifyStep } from '@/screens/replicas/FireSelectorVerifyStep';

type CreateStep = 'weapon' | 'mapSelector' | 'verifyMapping' | 'name';

const WEAPON_TYPE_OPTIONS = REPLICA_TYPES.map((type) => ({ value: type, label: type }));

type CreateReplicaFlowProps = {
  mac: string;
  boundFcuName: string;
};

export function CreateReplicaScreen() {
  const router = useRouter();
  const { bluetoothMac, fcuName } = useLocalSearchParams<{
    bluetoothMac?: string;
    fcuName?: string;
  }>();
  const mac = typeof bluetoothMac === 'string' ? bluetoothMac : '';
  const boundFcuName = typeof fcuName === 'string' ? fcuName.trim() : '';

  useEffect(() => {
    if (!mac || !boundFcuName) {
      router.replace('/replicas/select-fcu');
    }
  }, [boundFcuName, mac, router]);

  if (!mac || !boundFcuName) {
    return null;
  }

  return <CreateReplicaFlow mac={mac} boundFcuName={boundFcuName} />;
}

function CreateReplicaFlow({ mac, boundFcuName }: CreateReplicaFlowProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { create } = useReplicas();

  const [step, setStep] = useState<CreateStep>('weapon');
  const [type, setType] = useState<ReplicaType>('M4');
  const [metadata, setMetadata] = useState<WeaponMetadataValues>({});
  const [selectedGunSlotIds, setSelectedGunSlotIds] = useState<FireSelectorSlotId[]>([]);
  const [selectorPositionMapping, setSelectorPositionMapping] = useState<
    SelectorPositionMappingEntry[]
  >([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fcuNumPositions, setFcuNumPositions] = useState(0);
  const [mappingSubphase, setMappingSubphase] =
    useState<FireSelectorMappingSubphase>('pick');
  const [liveFcuPosition, setLiveFcuPosition] = useState<number | null>(null);

  const onCreateFcuEvent = useCallback((event: FCUToHostEvent) => {
    if (event.tag === 'SelectorPositionChange') {
      setLiveFcuPosition(event.position);
    }
  }, []);

  const createFcu = useCreateReplicaFcu(mac, { onEvent: onCreateFcuEvent });

  const metadataFields = useMemo(() => getWeaponMetadataFields(type), [type]);

  useEffect(() => {
    const count = createFcu.characteristics?.num_fire_positions ?? 0;
    if (count > 0) {
      setFcuNumPositions(count);
    }
  }, [createFcu.characteristics]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      releaseReplicaCreationSession();
    });
  }, [navigation]);

  useEffect(() => {
    setMetadata({});
    setSelectedGunSlotIds([]);
    setSelectorPositionMapping([]);
    setMappingSubphase('pick');
  }, [type]);

  useEffect(() => {
    setSelectedGunSlotIds([]);
    setSelectorPositionMapping([]);
    setMappingSubphase('pick');
  }, [metadata.fireSelectorPositions]);

  const weaponStepComplete =
    !hasWeaponMetadata(type) || isWeaponMetadataComplete(type, metadata);

  const slotPickRequired = useMemo(
    () =>
      fcuNumPositions > 0 && needsGunSlotSelection(type, metadata, fcuNumPositions),
    [type, metadata, fcuNumPositions],
  );

  const inMappingPickSubphase =
    step === 'mapSelector' && slotPickRequired && mappingSubphase === 'pick';

  const useFlexPickLayout = inMappingPickSubphase;

  const mappingFooterEnabled = useMemo(
    () =>
      canContinueFireSelectorMappingStep(
        type,
        metadata,
        fcuNumPositions,
        selectedGunSlotIds,
        selectorPositionMapping,
        mappingSubphase,
      ),
    [
      type,
      metadata,
      fcuNumPositions,
      selectedGunSlotIds,
      selectorPositionMapping,
      mappingSubphase,
    ],
  );

  const mappingStepComplete =
    fcuNumPositions > 0 &&
    isFireSelectorMappingStepComplete(
      type,
      metadata,
      fcuNumPositions,
      selectedGunSlotIds,
      selectorPositionMapping,
    );

  const handleContinueFromWeapon = useCallback(() => {
    if (!weaponStepComplete) {
      return;
    }

    setMappingSubphase('pick');
    setStep('mapSelector');
  }, [weaponStepComplete]);

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

  const handleContinueFromVerify = useCallback(() => {
    setStep('name');
  }, []);

  const handleGoBackFromVerify = useCallback(() => {
    setMappingSubphase('map');
    setStep('mapSelector');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'name') {
      setStep('verifyMapping');
      return;
    }

    if (step === 'verifyMapping') {
      setStep('mapSelector');
      return;
    }

    if (step === 'mapSelector') {
      setStep('weapon');
      return;
    }

    releaseReplicaCreationSession();
    router.back();
  }, [router, step]);

  const handleCreate = useCallback(async () => {
    if (!mac || !boundFcuName || !name.trim()) {
      return;
    }

    if (!weaponStepComplete || !mappingStepComplete) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const assignments = await loadDefaultProfilesFromFcu(mac, selectorPositionMapping);

      await create({
        name,
        type,
        bluetoothMac: mac,
        fcuName: boundFcuName,
        ...metadata,
        selectorPositionMapping,
        selectorPositionProfiles: assignments,
      });

      releaseReplicaCreationSession();
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [
    boundFcuName,
    create,
    mac,
    mappingStepComplete,
    metadata,
    name,
    router,
    selectorPositionMapping,
    type,
    weaponStepComplete,
  ]);

  const stepTitle =
    step === 'weapon'
      ? 'Weapon type'
      : step === 'mapSelector'
        ? 'Map fire selector'
        : step === 'verifyMapping'
          ? 'Verify mapping'
          : 'Name replica';

  const fireSelectorMappingStep = (
    <FireSelectorMappingStep
      replicaType={type}
      metadata={metadata}
      peripheralId={mac}
      selectedGunSlotIds={selectedGunSlotIds}
      mapping={selectorPositionMapping}
      subphase={mappingSubphase}
      onSubphaseChange={setMappingSubphase}
      layout="fill"
      fcu={createFcu}
      liveFcuPosition={liveFcuPosition}
      onSelectedGunSlotsChange={setSelectedGunSlotIds}
      onMappingChange={setSelectorPositionMapping}
      onFcuNumPositionsChange={setFcuNumPositions}
    />
  );

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
        <Text style={[styles.title, { color: theme.colors.foreground }]}>New replica</Text>
      </View>

      <Text style={[styles.pairedFcu, { color: theme.colors.muted }]}>
        Paired FCU: <Text style={{ color: theme.colors.foreground }}>{boundFcuName}</Text>
      </Text>

      <Text style={[styles.stepTitle, { color: theme.colors.foreground }]}>{stepTitle}</Text>

      {step === 'verifyMapping' ? (
        <View style={[styles.body, styles.bodyContentFlex]}>
          <FireSelectorVerifyStep
            replicaType={type}
            peripheralId={mac}
            mapping={selectorPositionMapping}
          />
          {error ? <Text style={[styles.error, { color: theme.colors.primary }]}>{error}</Text> : null}
        </View>
      ) : step === 'mapSelector' ? (
        <View style={[styles.body, styles.bodyContentFlex]}>
          {fireSelectorMappingStep}
          {error ? <Text style={[styles.error, { color: theme.colors.primary }]}>{error}</Text> : null}
        </View>
      ) : (
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
      >
        {step === 'weapon' ? (
          <>
            <Dropdown
              label="Weapon type"
              value={type}
              options={WEAPON_TYPE_OPTIONS}
              onChange={setType}
              style={metadataFields.length === 0 ? undefined : styles.dropdownWithMetadata}
            />

            {metadataFields.map((field) => (
              <View key={field.key} style={styles.metadataField}>
                <Text style={[styles.metadataLabel, { color: theme.colors.muted }]}>
                  {field.label}
                </Text>
                <View style={styles.choiceRow}>
                  {field.options.map((option) => {
                    const selected = metadata[field.key] === option.value;

                    return (
                      <Pressable
                        key={String(option.value)}
                        onPress={() =>
                          setMetadata((prev) => ({ ...prev, [field.key]: option.value }))
                        }
                        style={({ pressed }) => [
                          styles.choiceOption,
                          {
                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: selected
                              ? theme.colors.primary
                              : theme.colors.background,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected
                              ? theme.colors.primaryForeground
                              : theme.colors.foreground,
                            fontWeight: '600',
                          }}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        ) : null}

        {step === 'name' ? (
          <>
            <Text style={[styles.label, { color: theme.colors.muted }]}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Replica name"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: theme.colors.foreground,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                },
              ]}
            />
          </>
        ) : null}

        {error ? <Text style={[styles.error, { color: theme.colors.primary }]}>{error}</Text> : null}
      </ScrollView>
      )}

      <View style={styles.footer}>
        {step === 'weapon' ? (
          <Pressable
            onPress={handleContinueFromWeapon}
            disabled={!weaponStepComplete}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed || !weaponStepComplete ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.primaryButtonLabel, { color: theme.colors.primaryForeground }]}>
              Continue
            </Text>
          </Pressable>
        ) : null}

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
              onPress={handleGoBackFromVerify}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryButtonLabel, { color: theme.colors.foreground }]}>
                Go Back
              </Text>
            </Pressable>
            <Pressable
              onPress={handleContinueFromVerify}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.footerPrimaryHalf,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.primaryButtonLabel, { color: theme.colors.primaryForeground }]}>
                Continue
              </Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'name' ? (
          <Pressable
            onPress={() => void handleCreate()}
            disabled={saving || !name.trim()}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed || saving || !name.trim() ? 0.6 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <Text style={[styles.primaryButtonLabel, { color: theme.colors.primaryForeground }]}>
                Create replica
              </Text>
            )}
          </Pressable>
        ) : null}
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
  pairedFcu: {
    fontSize: 14,
    marginBottom: 16,
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
  footerRow: {
    flexDirection: 'row',
    gap: 10,
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
  dropdownWithMetadata: {
    marginBottom: 24,
  },
  metadataField: {
    marginBottom: 20,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceOption: {
    flex: 1,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
    marginTop: 12,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 16,
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
});
