import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BluetoothOffBlock,
  bluetoothOffBlockAction,
} from '@/components/BluetoothOffBlock';
import { AnimatedFireSelectorGraphic } from '@/components/fire-selector/AnimatedFireSelectorGraphic';
import { FireSelectorUnmappedGraphic } from '@/components/fire-selector/FireSelectorUnmappedGraphic';
import { useBluetoothGate } from '@/hooks/use-bluetooth-gate';
import { useLiveSelectorRotation } from '@/hooks/use-live-selector-rotation';
import { useTheme } from '@/hooks/use-theme';
import { getFireSelectorAspect } from '@/replicas/fire-selector-replica-config';
import { getFireSelectorPivot } from '@/replicas/fire-selector-pivot';
import { scaleToFitMaxBox } from '@/replicas/fire-selector-sweep';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';
import type { ReplicaType } from '@/replicas/types';

export type LiveSelectorBelowGraphicContext = {
  fcuPosition: number | null;
  isUnmapped: boolean;
  ready: boolean;
};

type LiveFireSelectorPanelProps = {
  replicaType: ReplicaType;
  peripheralId: string;
  mapping: SelectorPositionMappingEntry[];
  /** Explicit graphic height override (px). Prefer `maxGraphicWidth` / `maxGraphicHeight`. */
  graphicSize?: number;
  /** Max width (px) for the swept selector bounding box; used with `maxGraphicHeight`. */
  maxGraphicWidth?: number;
  /** Max height (px) for the swept selector bounding box; used with `maxGraphicWidth`. */
  maxGraphicHeight?: number;
  hint?: string;
  captionMode?: 'slot' | 'fireMode' | 'none';
  /** When false, skips BLE fire-mode reads (profile UI supplies the caption). */
  fetchFireModeLabel?: boolean;
  /** Compact sizes to content; fill gives graphic area flex so a parent can measure it. */
  layout?: 'default' | 'compact' | 'fill';
  onGraphicAreaLayout?: (width: number, height: number) => void;
  onPositionContextChange?: (ctx: LiveSelectorBelowGraphicContext) => void;
  renderBelowGraphic?: (ctx: LiveSelectorBelowGraphicContext) => ReactNode;
};

export function LiveFireSelectorPanel({
  replicaType,
  peripheralId,
  mapping,
  graphicSize,
  maxGraphicWidth,
  maxGraphicHeight,
  hint,
  captionMode = 'slot',
  fetchFireModeLabel = true,
  layout = 'default',
  onGraphicAreaLayout,
  onPositionContextChange,
  renderBelowGraphic,
}: LiveFireSelectorPanelProps) {
  const fill = layout === 'fill';
  const compact = layout === 'compact' || fill;
  const { theme } = useTheme();

  const sizeFromMaxBox = useMemo(() => {
    if (
      maxGraphicWidth === undefined ||
      maxGraphicHeight === undefined ||
      maxGraphicWidth <= 0 ||
      maxGraphicHeight <= 0
    ) {
      return 0;
    }
    return scaleToFitMaxBox({
      replicaType,
      aspect: getFireSelectorAspect(replicaType),
      pivot: getFireSelectorPivot(replicaType),
      maxWidth: maxGraphicWidth,
      maxHeight: maxGraphicHeight,
    });
  }, [maxGraphicHeight, maxGraphicWidth, replicaType]);

  const size =
    graphicSize && graphicSize > 0
      ? graphicSize
      : sizeFromMaxBox > 0
        ? sizeFromMaxBox
        : fill
          ? 0
          : replicaType === 'M4'
            ? 200
            : 160;

  const bluetoothGate = useBluetoothGate({ promptOnFocus: true });

  const {
    rotationDeg,
    slotLabel,
    fireModeLabel,
    fireModeLoading,
    fireModeFailed,
    isUnmapped,
    fcuPosition,
    connectionStatus,
    error,
    ready,
    reconnect,
  } = useLiveSelectorRotation(peripheralId, replicaType, mapping, {
    fetchFireModeLabel,
  });

  useEffect(() => {
    onPositionContextChange?.({ fcuPosition, isUnmapped, ready });
  }, [fcuPosition, isUnmapped, onPositionContextChange, ready]);

  if (bluetoothGate.blocked) {
    const message =
      bluetoothGate.bluetoothUnavailableMessage ?? 'Bluetooth is not available.';
    return (
      <View style={styles.centered}>
        <BluetoothOffBlock
          message={message}
          subtitle={bluetoothGate.bluetoothOffSubtitle}
          actionLabel={bluetoothGate.bluetoothActionLabel}
          onAction={bluetoothOffBlockAction(
            bluetoothGate.bluetoothState,
            bluetoothGate.requestEnable,
            bluetoothGate.openSettings,
          )}
        />
      </View>
    );
  }

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
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
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

  const showSlotCaption = captionMode === 'slot' && slotLabel && !isUnmapped;
  const showFireModeCaption =
    captionMode === 'fireMode' && !isUnmapped && !renderBelowGraphic && fetchFireModeLabel;
  const belowGraphic =
    captionMode === 'fireMode' && renderBelowGraphic
      ? renderBelowGraphic({ fcuPosition, isUnmapped, ready })
      : null;

  return (
    <View style={[styles.content, compact && !fill && styles.contentCompact, fill && styles.contentFill]}>
      {hint ? (
        <Text style={[styles.hint, { color: theme.colors.muted }]}>{hint}</Text>
      ) : null}

      <View
        style={[
          styles.graphicArea,
          compact && !fill && styles.graphicAreaCompact,
          fill && styles.graphicAreaFill,
        ]}
        onLayout={
          fill
            ? (event) => {
                const { width, height } = event.nativeEvent.layout;
                onGraphicAreaLayout?.(width, height);
              }
            : undefined
        }
      >
        {isUnmapped ? (
          <FireSelectorUnmappedGraphic size={size > 0 ? size : undefined} />
        ) : size > 0 ? (
          <AnimatedFireSelectorGraphic
            replicaType={replicaType}
            rotationDeg={rotationDeg}
            size={size}
          />
        ) : null}
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

      {belowGraphic ? (
        <View style={styles.belowGraphic}>{belowGraphic}</View>
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
  contentCompact: {
    flex: 0,
  },
  contentFill: {
    flex: 1,
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
  graphicAreaCompact: {
    flex: 0,
    minHeight: 0,
  },
  graphicAreaFill: {
    flex: 1,
    minHeight: 0,
    overflow: 'visible',
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
  belowGraphic: {
    width: '100%',
    alignItems: 'center',
    zIndex: 20,
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
