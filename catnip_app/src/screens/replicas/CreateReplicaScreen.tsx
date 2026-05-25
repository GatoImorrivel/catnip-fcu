import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import {
  getWeaponMetadataFields,
  hasWeaponMetadata,
  isWeaponMetadataComplete,
  type WeaponMetadataValues,
} from '@/replicas/weapon-metadata';
import { REPLICA_TYPES, type ReplicaType } from '@/replicas';
import { Dropdown } from '@/screens/components/Dropdown';
import { Screen } from '@/screens/components';

type CreateStep = 'weapon' | 'name';

const WEAPON_TYPE_OPTIONS = REPLICA_TYPES.map((type) => ({ value: type, label: type }));

export function CreateReplicaScreen() {
  const router = useRouter();
  const { bluetoothMac, fcuName } = useLocalSearchParams<{
    bluetoothMac?: string;
    fcuName?: string;
  }>();
  const mac = typeof bluetoothMac === 'string' ? bluetoothMac : '';
  const boundFcuName = typeof fcuName === 'string' ? fcuName.trim() : '';
  const { theme } = useTheme();
  const { create } = useReplicas();

  const [step, setStep] = useState<CreateStep>('weapon');
  const [type, setType] = useState<ReplicaType>('M4');
  const [metadata, setMetadata] = useState<WeaponMetadataValues>({});
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metadataFields = useMemo(() => getWeaponMetadataFields(type), [type]);

  useEffect(() => {
    if (!mac || !boundFcuName) {
      router.replace('/replicas/select-fcu');
    }
  }, [boundFcuName, mac, router]);

  useEffect(() => {
    setMetadata({});
  }, [type]);

  const weaponStepComplete =
    !hasWeaponMetadata(type) || isWeaponMetadataComplete(type, metadata);

  const handleContinueFromWeapon = useCallback(() => {
    if (!weaponStepComplete) {
      return;
    }

    setStep('name');
  }, [weaponStepComplete]);

  const handleBack = useCallback(() => {
    if (step === 'name') {
      setStep('weapon');
      return;
    }

    router.back();
  }, [router, step]);

  const handleCreate = useCallback(async () => {
    if (!mac || !boundFcuName || !name.trim()) {
      return;
    }

    if (!weaponStepComplete) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await create({
        name,
        type,
        bluetoothMac: mac,
        fcuName: boundFcuName,
        ...metadata,
      });
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [boundFcuName, create, mac, metadata, name, router, type, weaponStepComplete]);

  if (!mac || !boundFcuName) {
    return null;
  }

  const stepTitle = step === 'weapon' ? 'Weapon type' : 'Name replica';

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

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
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
