import { useEffect, useMemo } from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FireSelectorMappingCarousel,
  FireSelectorSlotPicker,
} from '@/components/fire-selector';
import { useFireSelectorAssign } from '@/hooks/use-fire-selector-assign';
import { useFcuCharacteristics } from '@/hooks/use-fcu-characteristics';
import { useTheme } from '@/hooks/use-theme';
import type { CreateReplicaFcuBinding } from '@/screens/replicas/create-replica-fcu';
import {
  getRequiredMappingCount,
  getSlotsForMapping,
  needsGunSlotSelection,
  type FireSelectorSlotId,
} from '@/replicas/fire-selector-layout';
import {
  isGunSlotSelectionComplete,
  isMappingComplete,
} from '@/replicas/selector-mapping';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';
import type { ReplicaType } from '@/replicas/types';
import type { WeaponMetadataValues } from '@/replicas/weapon-metadata';

export type FireSelectorMappingSubphase = 'pick' | 'map';

type FireSelectorMappingStepProps = {
  replicaType: ReplicaType;
  metadata: WeaponMetadataValues;
  peripheralId: string;
  selectedGunSlotIds: FireSelectorSlotId[];
  mapping: SelectorPositionMappingEntry[];
  subphase: FireSelectorMappingSubphase;
  onSubphaseChange: (subphase: FireSelectorMappingSubphase) => void;
  /** `fill` lets the slot picker expand in a flex parent (pick subphase). */
  layout?: 'default' | 'fill';
  onSelectedGunSlotsChange: (slotIds: FireSelectorSlotId[]) => void;
  onMappingChange: (mapping: SelectorPositionMappingEntry[]) => void;
  onFcuNumPositionsChange?: (count: number) => void;
  /** When set (create-replica flow), skips connect/characteristics fetch — uses the Pair FCU session. */
  fcu?: CreateReplicaFcuBinding;
};

function buildPickPhaseHint(requiredCount: number): string {
  return `Tap the fire-selector orientations you use on this replica. You will map ${requiredCount} of them on the next step.`;
}

function buildMapPhaseHint(slotCount: number, hadPickStep: boolean): string {
  if (hadPickStep) {
    return `For each graphic below, move your fire selector to match it, then Assign. Complete all ${slotCount} you chose.`;
  }

  return 'For each graphic below, move your fire selector to match it, then Assign until all are mapped.';
}

export function canContinueFireSelectorMappingStep(
  replicaType: ReplicaType,
  metadata: WeaponMetadataValues,
  fcuNumPositions: number,
  selectedGunSlotIds: FireSelectorSlotId[],
  mapping: SelectorPositionMappingEntry[],
  subphase: FireSelectorMappingSubphase,
): boolean {
  if (fcuNumPositions <= 0) {
    return false;
  }

  if (needsGunSlotSelection(replicaType, metadata, fcuNumPositions) && subphase === 'pick') {
    const required = getRequiredMappingCount(replicaType, metadata, fcuNumPositions);
    return isGunSlotSelectionComplete(selectedGunSlotIds, required);
  }

  return isMappingComplete(replicaType, metadata, fcuNumPositions, mapping);
}

export function FireSelectorMappingStep({
  replicaType,
  metadata,
  peripheralId,
  selectedGunSlotIds,
  mapping,
  subphase,
  onSubphaseChange,
  layout = 'default',
  onSelectedGunSlotsChange,
  onMappingChange,
  onFcuNumPositionsChange,
  fcu: fcuBinding,
}: FireSelectorMappingStepProps) {
  const { theme } = useTheme();
  const fillPickLayout = layout === 'fill';

  const fetchedFcu = useFcuCharacteristics(fcuBinding ? null : peripheralId);

  const characteristics = fcuBinding?.characteristics ?? fetchedFcu.characteristics;
  const charsLoading = fcuBinding ? false : fetchedFcu.loading;
  const charsError = fcuBinding?.error ?? fetchedFcu.error;
  const connectionStatus = fcuBinding?.connectionStatus ?? fetchedFcu.connectionStatus;
  const reconnect = fcuBinding?.reconnect ?? fetchedFcu.reconnect;
  const client = fcuBinding?.client ?? fetchedFcu.client;
  const ready = fcuBinding?.ready ?? fetchedFcu.ready;

  const hasCharacteristics = characteristics != null;
  const fcuNumPositions = characteristics?.num_fire_positions ?? 0;

  useEffect(() => {
    if (fcuNumPositions > 0) {
      onFcuNumPositionsChange?.(fcuNumPositions);
    }
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
      onSubphaseChange('map');
    }
  }, [fcuNumPositions, onSubphaseChange, slotPickRequired]);

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

  const showPickPhase = slotPickRequired && subphase === 'pick';
  const showMapPhase = !slotPickRequired || subphase === 'map';

  const { assign, assigning, assigningSlotId, error } = useFireSelectorAssign(
    client,
    ready,
    mapping,
    onMappingChange,
  );

  // Session can briefly sit in `idle` between teardown and `connecting`; treat that as
  // in-progress so we do not flash the retry UI during a normal connect cycle.
  const showConnecting =
    !hasCharacteristics &&
    connectionStatus !== 'error' &&
    !charsError &&
    (connectionStatus === 'connecting' ||
      charsLoading ||
      connectionStatus === 'idle');

  const showConnectionError =
    !hasCharacteristics &&
    (connectionStatus === 'error' || (charsError != null && !showConnecting));

  if (showConnecting) {
    return (
      <View style={[styles.centered, fillPickLayout && styles.centeredFill]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.statusText, { color: theme.colors.muted }]}>
          Connecting to FCU…
        </Text>
      </View>
    );
  }

  if (showConnectionError) {
    return (
      <View style={[styles.centered, fillPickLayout && styles.centeredFill]}>
        <Text style={[styles.error, { color: theme.colors.error }]}>
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
    <View style={fillPickLayout && showPickPhase ? styles.rootFill : undefined}>
      {showPickPhase ? (
        <View style={fillPickLayout ? styles.pickPhaseFill : undefined}>
          <Text style={[styles.hint, { color: theme.colors.muted }]}>
            {buildPickPhaseHint(requiredCount)}
          </Text>
          <Text style={[styles.phaseTitle, { color: theme.colors.foreground }]}>
            Choose switch positions ({selectedGunSlotIds.length}/{requiredCount})
          </Text>
          <View style={fillPickLayout ? styles.pickPickerFill : undefined}>
            <FireSelectorSlotPicker
              replicaType={replicaType}
              selectedSlotIds={selectedGunSlotIds}
              requiredCount={requiredCount}
              fillAvailable={fillPickLayout}
              onSelectionChange={onSelectedGunSlotsChange}
            />
          </View>
        </View>
      ) : null}

      {showMapPhase ? (
        <>
          <Text style={[styles.hint, { color: theme.colors.muted }]}>
            {buildMapPhaseHint(slotsToMap.length, slotPickRequired)}
          </Text>

          <Text style={[styles.phaseTitle, { color: theme.colors.foreground }]}>
            Map positions
          </Text>

          <FireSelectorMappingCarousel
            replicaType={replicaType}
            slots={slotsToMap}
            mapping={mapping}
            assigning={assigning}
            assigningSlotId={assigningSlotId}
            assignError={error}
            disabled={assigning}
            onAssign={assign}
          />
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
  rootFill: {
    flex: 1,
  },
  pickPhaseFill: {
    flex: 1,
  },
  pickPickerFill: {
    flex: 1,
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  centeredFill: {
    flex: 1,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
