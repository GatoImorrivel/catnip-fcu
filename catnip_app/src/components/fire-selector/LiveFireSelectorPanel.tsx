import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedFireSelectorGraphic } from '@/components/fire-selector/AnimatedFireSelectorGraphic';
import { useLiveSelectorRotation } from '@/hooks/use-live-selector-rotation';
import { useTheme } from '@/hooks/use-theme';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';
import type { ReplicaType } from '@/replicas/types';

type LiveFireSelectorPanelProps = {
  replicaType: ReplicaType;
  peripheralId: string;
  mapping: SelectorPositionMappingEntry[];
  graphicSize?: number;
  hint?: string;
  captionMode?: 'slot' | 'fireMode';
};

export function LiveFireSelectorPanel({
  replicaType,
  peripheralId,
  mapping,
  graphicSize,
  hint,
  captionMode = 'slot',
}: LiveFireSelectorPanelProps) {
  const { theme } = useTheme();
  const size = graphicSize ?? (replicaType === 'M4' ? 200 : 160);

  const {
    rotationDeg,
    slotLabel,
    fireModeLabel,
    fireModeLoading,
    fireModeFailed,
    isUnmapped,
    connectionStatus,
    error,
    ready,
    reconnect,
  } = useLiveSelectorRotation(peripheralId, replicaType, mapping);

  if (connectionStatus === 'connecting' || (!ready && connectionStatus !== 'error')) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={[styles.statusText, { color: theme.colors.muted }]}>
          Connecting to FCU…
        </Text>
      </View>
    );
  }

  if (error || connectionStatus === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: theme.colors.primary }]}>
          {error ?? 'Could not connect to FCU'}
        </Text>
        <Pressable
          onPress={reconnect}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: theme.colors.primary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={{ color: theme.colors.primaryForeground, fontWeight: '600' }}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  const showSlotCaption = captionMode === 'slot' && slotLabel;
  const showFireModeCaption = captionMode === 'fireMode' && !isUnmapped;

  return (
    <View style={styles.content}>
      {hint ? (
        <Text style={[styles.hint, { color: theme.colors.muted }]}>{hint}</Text>
      ) : null}

      <View style={styles.graphicArea}>
        <AnimatedFireSelectorGraphic
          replicaType={replicaType}
          rotationDeg={rotationDeg}
          size={size}
        />
      </View>

      {showSlotCaption ? (
        <Text style={[styles.caption, { color: theme.colors.foreground }]}>{slotLabel}</Text>
      ) : null}

      {showFireModeCaption ? (
        <View style={styles.captionRow}>
          {fireModeLoading ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : null}
          {fireModeLabel ? (
            <Text style={[styles.captionInline, { color: theme.colors.foreground }]}>
              {fireModeLabel}
            </Text>
          ) : fireModeFailed ? (
            <Text style={[styles.captionInline, { color: theme.colors.muted }]}>Unknown</Text>
          ) : null}
        </View>
      ) : null}

      {isUnmapped ? (
        <Text style={[styles.unmapped, { color: theme.colors.muted }]}>
          Unmapped hardware position
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
    width: '100%',
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  graphicArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    width: '100%',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
    minHeight: 28,
  },
  caption: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  captionInline: {
    fontSize: 18,
    fontWeight: '600',
  },
  unmapped: {
    fontSize: 14,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
});
