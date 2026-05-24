import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useReplicas } from '@/hooks/use-replicas';
import { useTheme } from '@/hooks/use-theme';
import { REPLICA_TYPES, type ReplicaType } from '@/replicas';
import { Screen } from '@/screens/components';

export function CreateReplicaScreen() {
  const router = useRouter();
  const { bluetoothMac } = useLocalSearchParams<{ bluetoothMac?: string }>();
  const mac = typeof bluetoothMac === 'string' ? bluetoothMac : '';
  const { theme } = useTheme();
  const { create } = useReplicas();
  const [name, setName] = useState('');
  const [type, setType] = useState<ReplicaType>('M4');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mac) {
      router.replace('/replicas/select-fcu');
    }
  }, [mac, router]);

  const handleSave = useCallback(async () => {
    if (!mac) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await create({ name, type, bluetoothMac: mac });
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [create, mac, name, router, type]);

  if (!mac) {
    return null;
  }

  return (
    <Screen>
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
        <Text style={[styles.title, { color: theme.colors.foreground }]}>New replica</Text>
      </View>

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

      <Text style={[styles.label, { color: theme.colors.muted }]}>Type</Text>
      <View style={styles.typeRow}>
        {REPLICA_TYPES.map((option) => {
          const selected = type === option;

          return (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              style={({ pressed }) => [
                styles.typeOption,
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
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.macLabel, { color: theme.colors.muted }]}>Paired FCU</Text>
      <Text style={[styles.macValue, { color: theme.colors.foreground }]}>{mac}</Text>

      {error ? <Text style={[styles.error, { color: theme.colors.primary }]}>{error}</Text> : null}

      <Pressable
        onPress={() => void handleSave()}
        disabled={saving || !name.trim()}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed || saving || !name.trim() ? 0.6 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={theme.colors.primaryForeground} />
        ) : (
          <Text style={[styles.saveLabel, { color: theme.colors.primaryForeground }]}>
            Save replica
          </Text>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
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
    marginBottom: 20,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 12,
  },
  macLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  macValue: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    marginBottom: 20,
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 48,
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
