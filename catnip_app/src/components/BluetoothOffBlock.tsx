import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BleState } from 'react-native-ble-manager';

import { useTheme } from '@/hooks/use-theme';

type BluetoothOffBlockProps = {
  message: string;
  subtitle?: string | null;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
};

export function BluetoothOffBlock({
  message,
  subtitle,
  actionLabel,
  onAction,
  compact = false,
}: BluetoothOffBlockProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.root, compact && styles.compact]}>
      <Text style={[styles.message, { color: theme.colors.error }]}>{message}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text>
      ) : null}
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.colors.primary, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export function bluetoothOffBlockAction(
  bluetoothState: BleState,
  requestEnable: () => Promise<unknown>,
  openSettings: () => Promise<void>,
): () => void {
  return () => {
    if (bluetoothState === BleState.Unauthorized) {
      void openSettings();
      return;
    }
    void requestEnable();
  };
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  compact: {
    paddingVertical: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
});
