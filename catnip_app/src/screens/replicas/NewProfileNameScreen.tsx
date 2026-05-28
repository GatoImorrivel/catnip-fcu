import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  assertUniqueProfileNameInProfiles,
  isProfileNameTakenInProfiles,
  parseSelectorPositionProfiles,
  upsertPositionProfileAssignment,
  validateProfileName,
} from '@/fcu-profiles';
import { defaultWireValuesFromSchema } from '@/lib/firemode-config-utils';
import { useFcuProfileCatalogKey } from '@/hooks/use-fcu-profile-catalog-key';
import { useFcuProfiles } from '@/hooks/use-fcu-profiles';
import { useFcuFireModeConfigFields } from '@/hooks/use-fcu-fire-mode';
import { useProfileFcuSync } from '@/hooks/use-profile-fcu-sync';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import { formatFireModeName, type FireModeName } from '@/messages/types';
import {
  invalidFieldBackgroundColor,
  invalidFieldBorderColor,
} from '@/components/form/invalid-field-styles';
import { Screen } from '@/screens/components';

import { parseFcuPosition } from './parse-fcu-position';

type ProfileNameInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  invalid: boolean;
  shakeTrigger: number;
  accessibilityLabel: string;
  accessibilityHint?: string;
  theme: ReturnType<typeof useTheme>['theme'];
};

function ProfileNameInput({
  value,
  onChangeText,
  editable,
  invalid,
  shakeTrigger,
  accessibilityLabel,
  accessibilityHint,
  theme,
}: ProfileNameInputProps) {
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (!invalid || shakeTrigger === 0) {
      return;
    }
    shakeX.value = withSequence(
      withTiming(-10, { duration: 45 }),
      withTiming(10, { duration: 45 }),
      withTiming(-8, { duration: 45 }),
      withTiming(8, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
  }, [invalid, shakeTrigger, shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View
      style={[
        shakeStyle,
        styles.inputWrap,
        {
          borderColor: invalid ? invalidFieldBorderColor(theme) : theme.colors.border,
          borderWidth: invalid ? 2 : StyleSheet.hairlineWidth,
          backgroundColor: invalid
            ? invalidFieldBackgroundColor(theme)
            : theme.colors.background,
        },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Profile name"
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="words"
        autoCorrect={false}
        editable={editable}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={[styles.input, { color: theme.colors.foreground }]}
      />
    </Animated.View>
  );
}

export function NewProfileNameScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id, firemode: firemodeParam, fcuPosition: fcuPositionParam } = useLocalSearchParams<{
    id?: string;
    firemode?: string;
    fcuPosition?: string;
  }>();

  const replicaId = typeof id === 'string' ? id : '';
  const firemodeName =
    typeof firemodeParam === 'string' && firemodeParam.length > 0
      ? (firemodeParam as FireModeName)
      : null;
  const fcuPosition = parseFcuPosition(
    typeof fcuPositionParam === 'string' ? fcuPositionParam : undefined,
  );

  const { get, update } = useReplicas();
  const [peripheralId, setPeripheralId] = useState<string | null>(null);
  const [storedCompatibilityId, setStoredCompatibilityId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [creating, setCreating] = useState(false);
  const [nameShakeTrigger, setNameShakeTrigger] = useState(0);
  const [nameTouched, setNameTouched] = useState(false);
  const creationCommittedRef = useRef(false);

  const compatibilityId = useFcuProfileCatalogKey(peripheralId, storedCompatibilityId);
  const fcuProfiles = useFcuProfiles(compatibilityId);
  const { pushProfileAtPosition, syncError, clearSyncError } = useProfileFcuSync({
    peripheralId,
    compatibilityId,
  });
  const { data: fireModeSchema, loading: schemaLoading } = useFcuFireModeConfigFields(
    peripheralId,
    firemodeName,
    {
      fetchEnabled: peripheralId !== null && firemodeName !== null,
    },
  );

  useEffect(() => {
    if (!replicaId) {
      setLoadError('Missing replica id');
      return;
    }
    if (!firemodeName) {
      setLoadError('Missing fire mode');
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
        setStoredCompatibilityId(
          typeof replica.fcuCompatibilityId === 'string'
            ? replica.fcuCompatibilityId
            : null,
        );
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
  }, [fcuPosition, firemodeName, get, replicaId]);

  const validateName = useCallback(
    (name: string): string | null => {
      const formatError = validateProfileName(name);
      if (formatError) {
        return formatError;
      }
      if (isProfileNameTakenInProfiles(fcuProfiles.profiles, name)) {
        return 'A profile with this name already exists';
      }
      return null;
    },
    [fcuProfiles.profiles],
  );

  const nameValidationError = useMemo(
    () => validateName(profileName),
    [profileName, validateName],
  );
  const showNameInvalid =
    nameTouched &&
    nameValidationError !== null &&
    !creating &&
    !creationCommittedRef.current;

  const handleCreate = useCallback(async () => {
    const trimmedName = profileName.trim();
    if (fcuPosition === null || !firemodeName || !compatibilityId) {
      return;
    }

    setCreating(true);
    setLoadError(null);

    try {
      assertUniqueProfileNameInProfiles(fcuProfiles.profiles, trimmedName);
      if (!fireModeSchema) {
        setLoadError('Fire mode schema not loaded from FCU yet');
        return;
      }
      const defaultConfig = defaultWireValuesFromSchema(fireModeSchema);
      const created = await fcuProfiles.createCustomProfile(
        trimmedName,
        firemodeName,
        defaultConfig,
      );
      creationCommittedRef.current = true;

      const replica = await get(replicaId);
      const existing = replica ? parseSelectorPositionProfiles(replica) : [];
      const assignments = upsertPositionProfileAssignment(
        existing,
        fcuPosition,
        created.id,
      );
      await update(replicaId, { selectorPositionProfiles: assignments });

      const bleError = await pushProfileAtPosition(fcuPosition, created.id);
      if (bleError !== null) {
        await fcuProfiles.deleteCustomProfile(created.id);
        const afterRollback = await get(replicaId);
        if (afterRollback) {
          await update(replicaId, {
            selectorPositionProfiles: parseSelectorPositionProfiles(afterRollback),
          });
        }
        setCreating(false);
        return;
      }

      router.dismissTo({
        pathname: '/replicas/[id]',
        params: { id: replicaId },
      });
      router.push({
        pathname: '/replicas/[id]/edit-profile',
        params: {
          id: replicaId,
          profileId: created.id,
          fcuPosition: String(fcuPosition),
        },
      });
    } catch (err: unknown) {
      creationCommittedRef.current = false;
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!creationCommittedRef.current) {
        setCreating(false);
      }
    }
  }, [
    fcuPosition,
    fcuProfiles,
    fireModeSchema,
    firemodeName,
    get,
    compatibilityId,
    profileName,
    pushProfileAtPosition,
    replicaId,
    router,
    update,
  ]);

  const canCreate =
    !loadError &&
    !creating &&
    fireModeSchema !== null &&
    !schemaLoading &&
    firemodeName !== null &&
    fcuPosition !== null &&
    compatibilityId !== null &&
    nameValidationError === null;

  const createButtonDisabled =
    creating || Boolean(loadError) || schemaLoading || fireModeSchema === null;

  const handleCreatePress = useCallback(() => {
    if (createButtonDisabled) {
      return;
    }
    if (nameValidationError !== null && !creationCommittedRef.current) {
      setNameShakeTrigger((count) => count + 1);
      return;
    }
    if (canCreate) {
      void handleCreate();
    }
  }, [canCreate, createButtonDisabled, handleCreate, nameValidationError]);

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          disabled={creating}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={1}>
          Profile name
        </Text>
      </View>

      {firemodeName ? (
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Fire mode: {formatFireModeName(firemodeName)}
        </Text>
      ) : null}

      {loadError || syncError ? (
        <View style={styles.errorBlock}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {loadError ?? syncError}
          </Text>
          {syncError && !loadError ? (
            <Pressable
              onPress={() => {
                clearSyncError();
                void handleCreate();
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry sync to FCU"
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={[styles.retryLabel, { color: theme.colors.foreground }]}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {schemaLoading ? (
        <View style={styles.schemaLoadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.muted }}>Loading fire mode schema…</Text>
        </View>
      ) : null}

      <Text style={[styles.label, { color: theme.colors.muted }]}>Name</Text>
      <ProfileNameInput
        value={profileName}
        onChangeText={(text) => {
          setNameTouched(true);
          setProfileName(text);
        }}
        editable={!creating}
        invalid={showNameInvalid}
        shakeTrigger={nameShakeTrigger}
        accessibilityLabel="Profile name"
        accessibilityHint={showNameInvalid ? (nameValidationError ?? undefined) : undefined}
        theme={theme}
      />
      <Text style={[styles.hint, { color: theme.colors.muted }]}>
        Must be unique among all profiles, including defaults. You can configure fields on the next
        screen.
      </Text>

      <View style={styles.footer}>
        <Pressable
          onPress={handleCreatePress}
          disabled={createButtonDisabled}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed || !canCreate ? 0.6 : 1,
            },
          ]}
        >
          {creating ? (
            <ActivityIndicator color={theme.colors.primaryForeground} />
          ) : (
            <Text style={[styles.primaryLabel, { color: theme.colors.primaryForeground }]}>
              Create profile
            </Text>
          )}
        </Pressable>
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
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  inputWrap: {
    borderRadius: 10,
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  errorBlock: {
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  schemaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 24,
    paddingBottom: 8,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
