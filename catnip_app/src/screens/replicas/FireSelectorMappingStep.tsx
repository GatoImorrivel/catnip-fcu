import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FireSelectorMappingCard,
  FireSelectorSlotPicker,
} from '@/components/fire-selector';
import { useFireSelectorAssign, slotAssignError } from '@/hooks/use-fire-selector-assign';
import { useFcuCharacteristics } from '@/hooks/use-fcu-characteristics';
import { useTheme } from '@/hooks/use-theme';
import {
  getRequiredMappingCount,
  getSlotsForMapping,
  needsGunSlotSelection,
  type FireSelectorSlotId,
} from '@/replicas/fire-selector-layout';
import {
  getMappingEntryForSlot,
  isGunSlotSelectionComplete,
  isMappingComplete,
} from '@/replicas/selector-mapping';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';
import type { ReplicaType } from '@/replicas/types';
import type { WeaponMetadataValues } from '@/replicas/weapon-metadata';

type FireSelectorMappingStepProps = {
  replicaType: ReplicaType;
  metadata: WeaponMetadataValues;
  peripheralId: string;
  selectedGunSlotIds: FireSelectorSlotId[];
  mapping: SelectorPositionMappingEntry[];
  onSelectedGunSlotsChange: (slotIds: FireSelectorSlotId[]) => void;
  onMappingChange: (mapping: SelectorPositionMappingEntry[]) => void;
  onFcuNumPositionsChange?: (count: number) => void;
};

function buildSelectionHint(
  replicaType: ReplicaType,
  metadata: WeaponMetadataValues,
  fcuNumPositions: number,
  requiredCount: number,
): string {
  const pickRequired = needsGunSlotSelection(replicaType, metadata, fcuNumPositions);
  if (!pickRequired) {
    return `Map each switch position to a hardware reading on your FCU (${fcuNumPositions} supported).`;
  }

  return `Your FCU supports ${fcuNumPositions} hardware position${fcuNumPositions === 1 ? '' : 's'}. Select ${requiredCount} switch position${requiredCount === 1 ? '' : 's'} on your replica, then map each one.`;
}

export function FireSelectorMappingStep({
  replicaType,
  metadata,
  peripheralId,
  selectedGunSlotIds,
  mapping,
  onSelectedGunSlotsChange,
  onMappingChange,
  onFcuNumPositionsChange,
}: FireSelectorMappingStepProps) {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<'pick' | 'map'>('pick');
  const [liveFcuPosition, setLiveFcuPosition] = useState<number | null>(null);

  const {
    characteristics,
    loading: charsLoading,
    error: charsError,
    connectionStatus,
    reconnect,
    client,
    ready,
  } = useFcuCharacteristics(peripheralId, {
    onEvent: (event) => {
      if (event.tag === 'SelectorPositionChange') {
        setLiveFcuPosition(event.position);
      }
    },
  });

  const fcuNumPositions = characteristics?.num_fire_positions ?? 0;

  useEffect(() => {
    onFcuNumPositionsChange?.(fcuNumPositions);
  }, [fcuNumPositions, onFcuNumPositionsChange]);

  const requiredCount = useMemo(
    () =>
      fcuNumPositions > 0
        ? getRequiredMappingCount(replicaType, metadata, fcuNumPositions)
        : 0,
    [replicaType, metadata, fcuNumPositions],
  );

  const slotPickRequired = useMemo(
    () =>
      fcuNumPositions > 0 &&
      needsGunSlotSelection(replicaType, metadata, fcuNumPositions),
    [replicaType, metadata, fcuNumPositions],
  );

  useEffect(() => {
    if (fcuNumPositions > 0 && !slotPickRequired) {
      setPhase('map');
    }
  }, [fcuNumPositions, slotPickRequired]);

  const selectionComplete = isGunSlotSelectionComplete(selectedGunSlotIds, requiredCount);
  const mappingComplete =
    fcuNumPositions > 0 &&
    isMappingComplete(replicaType, metadata, fcuNumPositions, mapping);

  const slotsToMap = useMemo(
    () =>
      fcuNumPositions > 0
        ? getSlotsForMapping(
            replicaType,
            selectedGunSlotIds,
            metadata,
            fcuNumPositions,
          )
        : [],
    [replicaType, selectedGunSlotIds, metadata, fcuNumPositions],
  );

  const showPickPhase = slotPickRequired && phase === 'pick';
  const showMapPhase = !slotPickRequired || phase === 'map';

  const { assign, assigning, assigningSlotId, error } = useFireSelectorAssign(
    client,
    ready,
    mapping,
    onMappingChange,
  );

  if (charsLoading || connectionStatus === 'connecting') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.statusText, { color: theme.colors.muted }]}>
          Connecting to FCU…
        </Text>
      </View>
    );
  }

  if (charsError || fcuNumPositions === 0) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.error, { color: theme.colors.primary }]}>
          {charsError ?? 'Could not read FCU characteristics'}
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

  return (
    <View>
      <Text style={[styles.hint, { color: theme.colors.muted }]}>
        {buildSelectionHint(replicaType, metadata, fcuNumPositions, requiredCount)}
      </Text>

      {liveFcuPosition !== null ? (
        <Text style={[styles.livePosition, { color: theme.colors.foreground }]}>
          Current FCU reading: {liveFcuPosition}
        </Text>
      ) : null}

      {showPickPhase ? (
        <>
          <Text style={[styles.phaseTitle, { color: theme.colors.foreground }]}>
            Choose switch positions ({selectedGunSlotIds.length}/{requiredCount})
          </Text>
          <FireSelectorSlotPicker
            replicaType={replicaType}
            selectedSlotIds={selectedGunSlotIds}
            requiredCount={requiredCount}
            onSelectionChange={onSelectedGunSlotsChange}
          />
          <Pressable
            onPress={() => setPhase('map')}
            disabled={!selectionComplete}
            style={({ pressed }) => [
              styles.phaseButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed || !selectionComplete ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.phaseButtonLabel, { color: theme.colors.primaryForeground }]}>
              Continue to mapping
            </Text>
          </Pressable>
        </>
      ) : null}

      {showMapPhase ? (
        <>
          {slotPickRequired ? (
            <Pressable onPress={() => setPhase('pick')} style={styles.backToPick}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                Change selected positions
              </Text>
            </Pressable>
          ) : null}

          <Text style={[styles.phaseTitle, { color: theme.colors.foreground }]}>
            Map positions
          </Text>

          {slotsToMap.map((slot) => {
            const entry = getMappingEntryForSlot(mapping, slot.id);
            const cardError = slotAssignError(mapping, slot.id, error, assigningSlotId);

            return (
              <FireSelectorMappingCard
                key={slot.id}
                replicaType={replicaType}
                slot={slot}
                mappingEntry={entry}
                assigning={assigning && assigningSlotId === slot.id}
                disabled={assigning}
                error={cardError}
                onAssign={() => {
                  void assign(slot.id);
                }}
              />
            );
          })}

          {mappingComplete ? (
            <Text style={[styles.completeHint, { color: theme.colors.muted }]}>
              All positions mapped. Press Continue below.
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function isFireSelectorMappingStepComplete(
  replicaType: ReplicaType,
  metadata: WeaponMetadataValues,
  fcuNumPositions: number,
  selectedGunSlotIds: FireSelectorSlotId[],
  mapping: SelectorPositionMappingEntry[],
): boolean {
  if (fcuNumPositions <= 0) {
    return false;
  }

  if (needsGunSlotSelection(replicaType, metadata, fcuNumPositions)) {
    const required = getRequiredMappingCount(replicaType, metadata, fcuNumPositions);
    if (!isGunSlotSelectionComplete(selectedGunSlotIds, required)) {
      return false;
    }
  }

  return isMappingComplete(replicaType, metadata, fcuNumPositions, mapping);
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  statusText: {
    fontSize: 14,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  livePosition: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  phaseButton: {
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 20,
  },
  phaseButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  backToPick: {
    marginBottom: 8,
    paddingVertical: 4,
  },
  completeHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
});
