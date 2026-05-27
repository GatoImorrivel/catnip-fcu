import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  isProfileNameTaken,
  validateProfileName,
} from '@/fcu-profiles';
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

  const { get } = useReplicas();
  const [peripheralId, setPeripheralId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

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
      if (peripheralId && isProfileNameTaken(peripheralId, name)) {
        return 'A profile with this name already exists';
      }
      return null;
    },
    [peripheralId],
  );

  const nameTaken = useMemo(() => {
    if (!peripheralId || !profileName.trim()) {
      return false;
    }
    return isProfileNameTaken(peripheralId, profileName);
  }, [peripheralId, profileName]);

  const handleContinue = useCallback(() => {
    const error = validateName(profileName);
    if (error || fcuPosition === null || !firemodeName) {
      setNameError(error);
      return;
    }

    router.push({
      pathname: '/replicas/[id]/new-profile/config',
      params: {
        id: replicaId,
        firemode: firemodeName,
        profileName: profileName.trim(),
        fcuPosition: String(fcuPosition),
      },
    });
  }, [fcuPosition, firemodeName, profileName, replicaId, router, validateName]);

  const canContinue =
    !loadError && firemodeName !== null && fcuPosition !== null && validateName(profileName) === null;

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
          Profile name
        </Text>
      </View>

      {firemodeName ? (
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Fire mode: {formatFireModeName(firemodeName)}
        </Text>
      ) : null}

      {loadError ? (
        <Text style={[styles.errorText, { color: theme.colors.primary }]}>{loadError}</Text>
      ) : null}

      <Text style={[styles.label, { color: theme.colors.muted }]}>Name</Text>
      <TextInput
        value={profileName}
        onChangeText={(text) => {
          setProfileName(text);
          setNameError(null);
        }}
        onBlur={() => setNameError(validateName(profileName))}
        placeholder="Profile name"
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="words"
        autoCorrect={false}
        style={[
          styles.input,
          {
            color: theme.colors.foreground,
            borderColor: nameError || nameTaken ? theme.colors.primary : theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      />
      {nameError ? (
        <Text style={[styles.fieldError, { color: theme.colors.primary }]}>{nameError}</Text>
      ) : nameTaken ? (
        <Text style={[styles.fieldError, { color: theme.colors.primary }]}>
          A profile with this name already exists
        </Text>
      ) : (
        <Text style={[styles.hint, { color: theme.colors.muted }]}>
          Must be unique among all profiles, including defaults.
        </Text>
      )}

      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed || !canContinue ? 0.6 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryLabel, { color: theme.colors.primaryForeground }]}>
            Continue
          </Text>
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  fieldError: {
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
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
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
