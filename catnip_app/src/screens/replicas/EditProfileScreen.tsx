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

import { FireModeConfigSchemaForm } from '@/components/firemode';
import { getProfileDisplayName, type FcuProfileId } from '@/fcu-profiles';
import { buildWireConfigForFcu } from '@/lib/firemode-config-utils';
import { useCatnipFcu } from '@/hooks/use-catnip-fcu';
import { useFcuProfiles } from '@/hooks/use-fcu-profiles';
import { useFcuFireModeConfigFields } from '@/hooks/use-fcu-fire-mode';
import { useProfileFcuSync } from '@/hooks/use-profile-fcu-sync';
import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import { formatFireModeName } from '@/messages/types';
import { Screen } from '@/screens/components';

function parseFcuPosition(value: string | undefined): number | null {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function EditProfileScreen() {
  const router = useRouter();
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
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [schemaInitialized, setSchemaInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fcuProfiles = useFcuProfiles(peripheralId);
  const { pushProfileAtPosition, syncError } = useProfileFcuSync(peripheralId);
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

      const values = buildWireConfigForFcu(schema, sourceConfig);
      if (cancelled) {
        return;
      }

      setConfigValues(values);
      if (!profile.isDefault) {
        fcuProfiles.updateCustomProfile(profileId!, values);
      }
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
  }, [profileId, firemodeName]);

  const handleSave = useCallback(async () => {
    if (!profileId || !profile || profile.isDefault || fcuPosition === null) {
      return;
    }

    setSaving(true);
    setLoadError(null);

    try {
      fcuProfiles.updateCustomProfile(profileId, configValues);
      const bleError = await pushProfileAtPosition(fcuPosition, profileId);
      if (bleError !== null) {
        return;
      }
      router.replace({
        pathname: '/replicas/[id]',
        params: { id: replicaId },
      });
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [
    configValues,
    fcuPosition,
    fcuProfiles,
    profile,
    profileId,
    pushProfileAtPosition,
    replicaId,
    router,
  ]);

  const displayError = loadError ?? schemaError ?? syncError;
  const loadingMessage =
    connectionStatus === 'connecting'
      ? 'Connecting to FCU…'
      : schemaLoading
        ? 'Loading config fields from FCU…'
        : null;

  const canSave =
    Boolean(profile) &&
    !profile?.isDefault &&
    fcuPosition !== null &&
    Boolean(schema) &&
    !schemaLoading &&
    !saving &&
    !displayError;

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.replace({
              pathname: '/replicas/[id]',
              params: { id: replicaId },
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Back to replica"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={1}>
          {profile ? getProfileDisplayName(profile) : 'Edit profile'}
        </Text>
      </View>

      {firemodeName ? (
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Configure {formatFireModeName(firemodeName)} (loaded from FCU).
        </Text>
      ) : null}

      {displayError ? (
        <View style={styles.statusBlock}>
          <Text style={[styles.errorText, { color: theme.colors.primary }]}>{displayError}</Text>
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
        {schema && !schemaLoading && profile && !profile.isDefault ? (
          <FireModeConfigSchemaForm
            schema={schema}
            values={configValues}
            onValuesChange={setConfigValues}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void handleSave()}
          disabled={!canSave}
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
