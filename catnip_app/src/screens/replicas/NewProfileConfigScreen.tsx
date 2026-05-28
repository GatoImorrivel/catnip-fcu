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

import { FireModeConfigSchemaForm, defaultWireValuesFromSchema } from '@/components/firemode';
import {
  buildWireConfigForFcu,
  isWireConfigValid,
} from '@/lib/firemode-config-utils';
import {
  assertUniqueProfileNameInProfiles,
  parseSelectorPositionProfiles,
  upsertPositionProfileAssignment,
} from '@/fcu-profiles';
import { useFcuProfileCatalogKey } from '@/hooks/use-fcu-profile-catalog-key';
import { useFcuProfiles } from '@/hooks/use-fcu-profiles';
import { useProfileFcuSync } from '@/hooks/use-profile-fcu-sync';
import { useFcuFireModeConfigFields } from '@/hooks/use-fcu-fire-mode';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import { formatFireModeName, type FireModeName } from '@/messages/types';
import { Screen } from '@/screens/components';

function parseFcuPosition(value: string | undefined): number | null {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function NewProfileConfigScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    id,
    firemode: firemodeParam,
    profileName: profileNameParam,
    fcuPosition: fcuPositionParam,
  } = useLocalSearchParams<{
    id?: string;
    firemode?: string;
    profileName?: string;
    fcuPosition?: string;
  }>();

  const replicaId = typeof id === 'string' ? id : '';
  const firemodeName =
    typeof firemodeParam === 'string' && firemodeParam.length > 0
      ? (firemodeParam as FireModeName)
      : null;
  const profileName =
    typeof profileNameParam === 'string' && profileNameParam.trim().length > 0
      ? profileNameParam.trim()
      : null;
  const fcuPosition = parseFcuPosition(
    typeof fcuPositionParam === 'string' ? fcuPositionParam : undefined,
  );

  const { get, update } = useReplicas();
  const [peripheralId, setPeripheralId] = useState<string | null>(null);
  const [storedCompatibilityId, setStoredCompatibilityId] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [schemaInitialized, setSchemaInitialized] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const compatibilityId = useFcuProfileCatalogKey(peripheralId, storedCompatibilityId);
  const fcuProfiles = useFcuProfiles(compatibilityId);
  const { pushProfileAtPosition, syncError } = useProfileFcuSync({
    peripheralId,
    compatibilityId,
  });

  const {
    data: schema,
    loading: schemaLoading,
    error: schemaError,
    connectionStatus,
    reconnect,
  } = useFcuFireModeConfigFields(peripheralId, firemodeName, {
    fetchEnabled: peripheralId !== null && firemodeName !== null,
  });

  useEffect(() => {
    if (!replicaId) {
      setLoadError('Missing replica id');
      return;
    }
    if (!firemodeName) {
      setLoadError('Missing fire mode');
      return;
    }
    if (!profileName) {
      setLoadError('Missing profile name');
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
  }, [fcuPosition, firemodeName, get, profileName, replicaId]);

  useEffect(() => {
    if (!schema || schemaInitialized) {
      return;
    }
    setConfigValues(defaultWireValuesFromSchema(schema));
    setSchemaInitialized(true);
  }, [schema, schemaInitialized]);

  useEffect(() => {
    setSchemaInitialized(false);
    setConfigValues({});
  }, [firemodeName]);

  const handleCreate = useCallback(async () => {
    if (!firemodeName || !profileName || fcuPosition === null || !compatibilityId || !schema) {
      return;
    }

    if (!isWireConfigValid(schema, configValues)) {
      return;
    }

    const wireConfig = buildWireConfigForFcu(schema, configValues);

    setCreating(true);
    try {
      assertUniqueProfileNameInProfiles(fcuProfiles.profiles, profileName);
      const created = await fcuProfiles.createCustomProfile(
        profileName,
        firemodeName,
        wireConfig,
      );

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
        return;
      }

      router.replace(`/replicas/${replicaId}`);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }, [
    configValues,
    fcuPosition,
    fcuProfiles,
    firemodeName,
    get,
    compatibilityId,
    profileName,
    pushProfileAtPosition,
    replicaId,
    router,
    schema,
    update,
  ]);

  const displayError = loadError ?? schemaError ?? syncError;
  const configValid = schema != null && isWireConfigValid(schema, configValues);
  const canCreate =
    Boolean(schema) &&
    !schemaLoading &&
    configValid &&
    !creating &&
    !displayError;

  const loadingMessage =
    connectionStatus === 'connecting'
      ? 'Connecting to FCU…'
      : schemaLoading
        ? 'Loading config fields from FCU…'
        : null;

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
        <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={1}>
          {profileName ?? 'New profile'}
        </Text>
      </View>

      {firemodeName ? (
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Configure {formatFireModeName(firemodeName)} (loaded from FCU).
        </Text>
      ) : null}

      {displayError ? (
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
        {schema && !schemaLoading ? (
          <FireModeConfigSchemaForm
            schema={schema}
            values={configValues}
            onValuesChange={setConfigValues}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void handleCreate()}
          disabled={!canCreate}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed || !canCreate ? 0.7 : 1,
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
