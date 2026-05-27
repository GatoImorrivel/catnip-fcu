import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.colors.muted }]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              disabled={confirming}
              style={({ pressed }) => [
                styles.secondaryButton,
                { opacity: pressed || confirming ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.secondaryLabel, { color: theme.colors.foreground }]}>
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={confirming}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed || confirming ? 0.6 : 1,
                },
              ]}
            >
              {confirming ? (
                <ActivityIndicator color={theme.colors.primaryForeground} />
              ) : (
                <Text style={[styles.primaryLabel, { color: theme.colors.primaryForeground }]}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 88,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
