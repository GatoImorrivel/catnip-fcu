import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FireSelectorGraphic } from '@/components/fire-selector/FireSelectorGraphic';
import { useTheme } from '@/hooks/use-theme';
import {
  getFireSelectorLayout,
  type FireSelectorSlot,
  type FireSelectorSlotId,
} from '@/replicas/fire-selector-layout';
import type { ReplicaType } from '@/replicas/types';

type FireSelectorSlotPickerProps = {
  replicaType: ReplicaType;
  selectedSlotIds: FireSelectorSlotId[];
  requiredCount: number;
  onSelectionChange: (slotIds: FireSelectorSlotId[]) => void;
};

function toggleSlot(
  selected: FireSelectorSlotId[],
  slot: FireSelectorSlot,
  requiredCount: number,
): FireSelectorSlotId[] {
  const isSelected = selected.includes(slot.id);
  if (isSelected) {
    return selected.filter((id) => id !== slot.id);
  }

  if (selected.length >= requiredCount) {
    return selected;
  }

  return [...selected, slot.id];
}

export function FireSelectorSlotPicker({
  replicaType,
  selectedSlotIds,
  requiredCount,
  onSelectionChange,
}: FireSelectorSlotPickerProps) {
  const { theme } = useTheme();
  const slots = getFireSelectorLayout(replicaType).slots;
  const atMax = selectedSlotIds.length >= requiredCount;
  const graphicSize = replicaType === 'M4' ? 88 : 72;

  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const selected = selectedSlotIds.includes(slot.id);
        const disabled = !selected && atMax;

        return (
          <Pressable
            key={slot.id}
            onPress={() => {
              if (disabled) {
                return;
              }
              onSelectionChange(toggleSlot(selectedSlotIds, slot, requiredCount));
            }}
            style={({ pressed }) => [
              styles.tile,
              {
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                backgroundColor: theme.colors.background,
                opacity: pressed ? 0.85 : disabled ? 0.45 : 1,
              },
            ]}
          >
            <View style={styles.graphicWrap}>
              <FireSelectorGraphic
                replicaType={replicaType}
                rotationDeg={slot.rotationDeg}
                size={graphicSize}
              />
            </View>
            <Text
              style={[
                styles.tileLabel,
                {
                  color: selected ? theme.colors.primary : theme.colors.foreground,
                  fontWeight: selected ? '700' : '600',
                },
              ]}
            >
              {slot.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  tile: {
    width: '47%',
    maxWidth: 180,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 120,
  },
  graphicWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    paddingVertical: 4,
  },
  tileLabel: {
    fontSize: 14,
    marginTop: 4,
  },
});
