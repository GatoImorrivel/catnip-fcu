import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FireSelectorGraphic } from '@/components/fire-selector/FireSelectorGraphic';
import { useTheme } from '@/hooks/use-theme';
import type { FireSelectorSlot } from '@/replicas/fire-selector-layout';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';
import type { ReplicaType } from '@/replicas/types';

type FireSelectorMappingCardProps = {
  replicaType: ReplicaType;
  slot: FireSelectorSlot;
  mappingEntry: SelectorPositionMappingEntry | undefined;
  onAssign: () => void;
  assigning: boolean;
  disabled?: boolean;
  error?: string | null;
};

export function FireSelectorMappingCard({
  replicaType,
  slot,
  mappingEntry,
  onAssign,
  assigning,
  disabled = false,
  error = null,
}: FireSelectorMappingCardProps) {
  const { theme } = useTheme();
  const assigned = mappingEntry !== undefined;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: assigned ? theme.colors.primary : theme.colors.border,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View style={styles.graphicWrap}>
        <FireSelectorGraphic
          replicaType={replicaType}
          rotationDeg={slot.rotationDeg}
          size={replicaType === 'M4' ? 110 : 96}
          rotationAnchor="svgCenter"
        />
      </View>

      <Text style={[styles.hint, { color: theme.colors.muted }]}>
        Move your fire selector to match the graphic, then Assign.
      </Text>

      {assigned ? (
        <Text style={[styles.assigned, { color: theme.colors.primary }]}>Assigned</Text>
      ) : null}

      {error ? (
        <Text style={[styles.error, { color: theme.colors.primary }]}>{error}</Text>
      ) : null}

      <Pressable
        onPress={onAssign}
        disabled={disabled || assigning}
        style={({ pressed }) => [
          styles.assignButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed || disabled || assigning ? 0.6 : 1,
          },
        ]}
      >
        {assigning ? (
          <ActivityIndicator color={theme.colors.primaryForeground} />
        ) : (
          <Text style={[styles.assignLabel, { color: theme.colors.primaryForeground }]}>
            {assigned ? 'Re-assign' : 'Assign'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 0,
  },
  graphicWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  hint: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 12,
    textAlign: 'center',
  },
  assigned: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  error: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  assignButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  assignLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
