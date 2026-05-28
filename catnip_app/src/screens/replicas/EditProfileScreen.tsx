import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import { ConfirmModal } from '@/components/fcu-profiles';
import { FireModeConfigSchemaForm } from '@/components/firemode';
import { useBluetoothGate } from '@/hooks/use-bluetooth-gate';
import { getProfileDisplayName, type FcuProfileId } from '@/fcu-profiles';
import {
  buildWireConfigForFcu,
  isWireConfigValid,
  mergeEditorConfigValues,
  wireConfigsEqual,
} from '@/lib/firemode-config-utils';
import { useCatnipFcu } from '@/hooks/use-catnip-fcu';
import { useFcuProfileCatalogKey } from '@/hooks/use-fcu-profile-catalog-key';
import { useFcuProfiles } from '@/hooks/use-fcu-profiles';
import { useFcuFireModeConfigFields } from '@/hooks/use-fcu-fire-mode';
import { useProfileFcuSync } from '@/hooks/use-profile-fcu-sync';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import { formatFireModeName } from '@/messages/types';
import { Screen } from '@/screens/components';

import { parseFcuPosition } from './parse-fcu-position';

const LIVE_PUSH_DEBOUNCE_MS = 400;

export function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { id, profileId: profileIdParam, fcuPosition: fcuPositionParam } = useLocalSearchParams<{
    id?: string;
    profileId?: string;
    fcuPosition?: string;
  }>();

  const replicaId = typeof id === 'string' ? id : '';
  const profileId =
    typeof profileIdParam === 'string' && profileIdParam.length > 0
      ? (profileIdParam as FcuProfileId)
      : null;
  const fcuPosition = parseFcuPosition(
    typeof fcuPositionParam === 'string' ? fcuPositionParam : undefined,
  );

  const { get } = useReplicas();
  const [peripheralId, setPeripheralId] = useState<string | null>(null);
  const [storedCompatibilityId, setStoredCompatibilityId] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [baselineValues, setBaselineValues] = useState<Record<string, string>>({});
  const [schemaInitialized, setSchemaInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invalidFieldsShakeTrigger, setInvalidFieldsShakeTrigger] = useState(0);

  const livePushEnabledRef = useRef(false);
  const allowLeaveRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bluetoothGate = useBluetoothGate({ promptOnFocus: true });
  const compatibilityId = useFcuProfileCatalogKey(peripheralId, storedCompatibilityId);
  const fcuProfiles = useFcuProfiles(compatibilityId);
  const { pushConfigAtPosition, syncError, syncing } = useProfileFcuSync({
    peripheralId,
    compatibilityId,
  });
  const { client, ready: fcuReady } = useCatnipFcu(peripheralId);
  const profile = profileId ? fcuProfiles.getProfileById(profileId) : undefined;
  const firemodeName = profile?.firemodeName ?? null;

  const {
    data: schema,
    loading: schemaLoading,
    error: schemaError,
    connectionStatus,
    reconnect,
  } = useFcuFireModeConfigFields(peripheralId, firemodeName, {
    fetchEnabled: peripheralId !== null && firemodeName !== null,
  });

  const cancelPendingLivePush = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const navigateAway = useCallback(() => {
    allowLeaveRef.current = true;
    router.replace({
      pathname: '/replicas/[id]',
      params: { id: replicaId },
    });
  }, [replicaId, router]);

  const isDirty = useMemo(
    () =>
      schemaInitialized &&
      schema != null &&
      !wireConfigsEqual(schema, configValues, baselineValues),
    [baselineValues, configValues, schema, schemaInitialized],
  );

  useEffect(() => {
    if (!replicaId) {
      setLoadError('Missing replica id');
      return;
    }
    if (!profileId) {
      setLoadError('Missing profile id');
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
  }, [fcuPosition, get, profileId, replicaId]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    if (profile.isDefault) {
      setLoadError('Default profiles cannot be edited');
    }
  }, [profile]);

  useEffect(() => {
    if (
      !schema ||
      !profile ||
      schemaInitialized ||
      !client ||
      !fcuReady ||
      fcuPosition === null
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      let sourceConfig = profile.config;
      try {
        const positionConfig = await client.getFireModeForPosition(fcuPosition);
        if (positionConfig.firemode_name === profile.firemodeName) {
          sourceConfig = positionConfig.config;
        }
      } catch {
        // Fall back to stored profile config.
      }

      const values = mergeEditorConfigValues(schema, sourceConfig);
      if (cancelled) {
        return;
      }

      setConfigValues(values);
      setBaselineValues(values);
      if (!profile.isDefault) {
        fcuProfiles.updateCustomProfile(profileId!, values);
      }
      livePushEnabledRef.current = true;
      setSchemaInitialized(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    client,
    fcuPosition,
    fcuProfiles,
    fcuReady,
    profile,
    profileId,
    schema,
    schemaInitialized,
  ]);

  useEffect(() => {
    setSchemaInitialized(false);
    setConfigValues({});
    setBaselineValues({});
    livePushEnabledRef.current = false;
    allowLeaveRef.current = false;
    cancelPendingLivePush();
  }, [cancelPendingLivePush, profileId, firemodeName]);

  useEffect(() => {
    return () => cancelPendingLivePush();
  }, [cancelPendingLivePush]);

  const handleValuesChange = useCallback(
    (next: Record<string, string>) => {
      setConfigValues(next);
      if (!livePushEnabledRef.current || !firemodeName || fcuPosition === null || !schema) {
        return;
      }
      cancelPendingLivePush();
      if (!isWireConfigValid(schema, next)) {
        return;
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void pushConfigAtPosition(
          fcuPosition,
          firemodeName,
          buildWireConfigForFcu(schema, next),
        );
      }, LIVE_PUSH_DEBOUNCE_MS);
    },
    [cancelPendingLivePush, firemodeName, fcuPosition, pushConfigAtPosition, schema],
  );

  const requestLeave = useCallback(() => {
    if (!isDirty) {
      navigateAway();
      return;
    }
    setDiscardModalOpen(true);
  }, [isDirty, navigateAway]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!isDirty || allowLeaveRef.current) {
        return;
      }
      event.preventDefault();
      setDiscardModalOpen(true);
    });
    return unsubscribe;
  }, [isDirty, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        requestLeave();
        return true;
      });
      return () => subscription.remove();
    }, [requestLeave]),
  );

  const handleDiscard = useCallback(async () => {
    if (!profileId || !firemodeName || fcuPosition === null || !schema) {
      return;
    }

    const wireBaseline = buildWireConfigForFcu(schema, baselineValues);

    setDiscarding(true);
    cancelPendingLivePush();
    livePushEnabledRef.current = false;

    try {
      setConfigValues(wireBaseline);
      if (profile && !profile.isDefault) {
        fcuProfiles.updateCustomProfile(profileId, wireBaseline);
      }
      await pushConfigAtPosition(fcuPosition, firemodeName, wireBaseline);
      setDiscardModalOpen(false);
      navigateAway();
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiscarding(false);
    }
  }, [
    baselineValues,
    cancelPendingLivePush,
    fcuPosition,
    fcuProfiles,
    firemodeName,
    navigateAway,
    profile,
    profileId,
    pushConfigAtPosition,
    schema,
  ]);

  const handleSave = useCallback(async () => {
    if (
      !profileId ||
      !profile ||
      profile.isDefault ||
      fcuPosition === null ||
      !firemodeName ||
      !schema
    ) {
      return;
    }

    if (!isWireConfigValid(schema, configValues)) {
      return;
    }

    const wireConfig = buildWireConfigForFcu(schema, configValues);

    setSaving(true);
    setLoadError(null);
    cancelPendingLivePush();
    livePushEnabledRef.current = false;

    try {
      fcuProfiles.updateCustomProfile(profileId, wireConfig);
      const bleError = await pushConfigAtPosition(fcuPosition, firemodeName, wireConfig);
      if (bleError !== null) {
        livePushEnabledRef.current = true;
        return;
      }
      setBaselineValues(wireConfig);
      setConfigValues(wireConfig);
      navigateAway();
    } catch (err: unknown) {
      livePushEnabledRef.current = true;
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [
    cancelPendingLivePush,
    configValues,
    fcuPosition,
    fcuProfiles,
    firemodeName,
    navigateAway,
    profile,
    profileId,
    pushConfigAtPosition,
    schema,
  ]);

  const displayError = loadError ?? schemaError ?? syncError;
  const valuesLoading =
    Boolean(schema) &&
    !schemaLoading &&
    !schemaInitialized &&
    Boolean(profile) &&
    !profile?.isDefault;
  const fcuSyncing = syncing && !saving && !discarding;
  const loadingMessage =
    !bluetoothGate.blocked && connectionStatus === 'connecting'
      ? 'Connecting to FCU…'
      : !bluetoothGate.blocked && schemaLoading
        ? 'Loading config fields from FCU…'
        : !bluetoothGate.blocked && valuesLoading
          ? 'Loading profile values…'
          : null;

  const configValid = schema != null && isWireConfigValid(schema, configValues);

  const canSave =
    Boolean(profile) &&
    !profile?.isDefault &&
    fcuPosition !== null &&
    Boolean(schema) &&
    configValid &&
    !schemaLoading &&
    !saving &&
    !discarding &&
    !displayError;

  const saveButtonDisabled =
    saving ||
    discarding ||
    !profile ||
    profile?.isDefault ||
    fcuPosition === null ||
    !schema ||
    schemaLoading ||
    !schemaInitialized ||
    Boolean(displayError);

  const handleSavePress = useCallback(() => {
    if (saveButtonDisabled) {
      return;
    }
    if (schema && !isWireConfigValid(schema, configValues)) {
      setInvalidFieldsShakeTrigger((count) => count + 1);
      return;
    }
    if (canSave) {
      void handleSave();
    }
  }, [canSave, configValues, handleSave, saveButtonDisabled, schema]);

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={requestLeave}
          accessibilityRole="button"
          accessibilityLabel="Back to replica"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: theme.colors.foreground }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {profile ? getProfileDisplayName(profile) : 'Edit profile'}
          </Text>
          {fcuSyncing ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              accessibilityLabel="Syncing to FCU"
            />
          ) : null}
        </View>
      </View>

      {firemodeName ? (
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Configure {formatFireModeName(firemodeName)} (loaded from FCU).
        </Text>
      ) : null}

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
        <View style={styles.statusBlock}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{displayError}</Text>
          {schemaError && peripheralId ? (
            <Pressable onPress={reconnect} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.retryText, { color: theme.colors.foreground }]}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {loadingMessage ? (
        <View style={styles.statusBlock}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.statusText, { color: theme.colors.muted }]}>{loadingMessage}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {schema && schemaInitialized && !schemaLoading && profile && !profile.isDefault ? (
          <FireModeConfigSchemaForm
            schema={schema}
            values={configValues}
            onValuesChange={handleValuesChange}
            shakeInvalidFieldsTrigger={invalidFieldsShakeTrigger}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSavePress}
          disabled={saveButtonDisabled}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed || !canSave ? 0.7 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.primaryForeground} />
          ) : (
            <Text style={[styles.primaryLabel, { color: theme.colors.primaryForeground }]}>
              Save profile
            </Text>
          )}
        </Pressable>
      </View>

      <ConfirmModal
        visible={discardModalOpen}
        title="Discard unsaved changes?"
        message="Your edits will be lost and the FCU will be restored to the previous configuration."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        confirming={discarding}
        onConfirm={() => void handleDiscard()}
        onCancel={() => setDiscardModalOpen(false)}
      />
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
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 6,
  },
  title: {
    flexShrink: 1,
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
    paddingBottom: 16,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
