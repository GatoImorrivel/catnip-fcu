import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';

import { FireSelectorMappingCard } from '@/components/fire-selector/FireSelectorMappingCard';
import { slotAssignError } from '@/hooks/use-fire-selector-assign';
import { useTheme } from '@/hooks/use-theme';
import type { FireSelectorSlot, FireSelectorSlotId } from '@/replicas/fire-selector-layout';
import { getMappingEntryForSlot } from '@/replicas/selector-mapping';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';
import type { ReplicaType } from '@/replicas/types';

const CAROUSEL_MIN_HEIGHT = 360;
const SCREEN_HORIZONTAL_PADDING = 32;

type FireSelectorMappingCarouselProps = {
  replicaType: ReplicaType;
  slots: FireSelectorSlot[];
  mapping: SelectorPositionMappingEntry[];
  assigning: boolean;
  assigningSlotId: FireSelectorSlotId | null;
  assignError: string | null;
  disabled?: boolean;
  onAssign: (slotId: FireSelectorSlotId) => Promise<string | null>;
};

function firstUnmappedIndex(
  slots: FireSelectorSlot[],
  mapping: SelectorPositionMappingEntry[],
): number {
  const index = slots.findIndex((slot) => !getMappingEntryForSlot(mapping, slot.id));
  return index >= 0 ? index : 0;
}

function nextUnmappedIndex(
  slots: FireSelectorSlot[],
  mapping: SelectorPositionMappingEntry[],
  afterIndex: number,
): number | null {
  for (let index = afterIndex + 1; index < slots.length; index++) {
    if (!getMappingEntryForSlot(mapping, slots[index]!.id)) {
      return index;
    }
  }
  return null;
}

export function FireSelectorMappingCarousel({
  replicaType,
  slots,
  mapping,
  assigning,
  assigningSlotId,
  assignError,
  disabled = false,
  onAssign,
}: FireSelectorMappingCarouselProps) {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = windowWidth - SCREEN_HORIZONTAL_PADDING;

  const listRef = useRef<FlatList<FireSelectorSlot>>(null);
  const assignSucceededRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(() => firstUnmappedIndex(slots, mapping));

  const slotsKey = useMemo(() => slots.map((slot) => slot.id).join(','), [slots]);

  const initialIndex = useMemo(
    () => firstUnmappedIndex(slots, mapping),
    [slots, mapping],
  );

  useEffect(() => {
    const index = firstUnmappedIndex(slots, mapping);
    setActiveIndex(index);
    if (slots.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: false });
      });
    }
  }, [slotsKey]);

  useEffect(() => {
    if (!assignSucceededRef.current) {
      return;
    }
    assignSucceededRef.current = false;

    const nextIndex = nextUnmappedIndex(slots, mapping, activeIndex);
    if (nextIndex === null) {
      return;
    }

    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  }, [activeIndex, mapping, slots]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setActiveIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const scrollToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= slots.length) {
        return;
      }
      setActiveIndex(index);
      listRef.current?.scrollToIndex({ index, animated: true });
    },
    [slots.length],
  );

  const handleAssign = useCallback(
    async (slotId: FireSelectorSlotId) => {
      const err = await onAssign(slotId);
      if (!err) {
        assignSucceededRef.current = true;
      }
    },
    [onAssign],
  );

  const activeSlot = slots[activeIndex];

  if (slots.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => scrollToIndex(activeIndex - 1)}
          disabled={activeIndex <= 0}
          accessibilityRole="button"
          accessibilityLabel="Previous position"
          hitSlop={8}
          style={({ pressed }) => [
            styles.arrowButton,
            { opacity: activeIndex <= 0 ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.colors.foreground} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.pageIndicator, { color: theme.colors.foreground }]}>
            {activeIndex + 1} of {slots.length}
          </Text>
          {activeSlot ? (
            <Text style={[styles.slotLabel, { color: theme.colors.muted }]}>
              {activeSlot.label}
            </Text>
          ) : null}
          <View style={styles.dots}>
            {slots.map((slot, index) => {
              const mapped = getMappingEntryForSlot(mapping, slot.id) !== undefined;
              const isActive = index === activeIndex;

              return (
                <View
                  key={slot.id}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: mapped
                        ? theme.colors.primary
                        : theme.colors.border,
                      width: isActive ? 10 : 6,
                      height: isActive ? 10 : 6,
                      borderRadius: isActive ? 5 : 3,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex >= slots.length - 1}
          accessibilityRole="button"
          accessibilityLabel="Next position"
          hitSlop={8}
          style={({ pressed }) => [
            styles.arrowButton,
            { opacity: activeIndex >= slots.length - 1 ? 0.35 : pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialIcons name="chevron-right" size={28} color={theme.colors.foreground} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slots}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={pageWidth}
        snapToAlignment="start"
        disableIntervalMomentum
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={(info) => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          });
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={[styles.list, { minHeight: CAROUSEL_MIN_HEIGHT }]}
        renderItem={({ item: slot }) => {
          const entry = getMappingEntryForSlot(mapping, slot.id);
          const cardError = slotAssignError(mapping, slot.id, assignError, assigningSlotId);

          return (
            <View style={[styles.page, { width: pageWidth }]}>
              <FireSelectorMappingCard
                replicaType={replicaType}
                slot={slot}
                mappingEntry={entry}
                assigning={assigning && assigningSlotId === slot.id}
                disabled={disabled}
                error={cardError}
                onAssign={() => {
                  void handleAssign(slot.id);
                }}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  arrowButton: {
    padding: 4,
    width: 40,
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pageIndicator: {
    fontSize: 15,
    fontWeight: '600',
  },
  slotLabel: {
    fontSize: 14,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {},
  list: {
    flexGrow: 0,
  },
  page: {
    flexShrink: 0,
  },
});
