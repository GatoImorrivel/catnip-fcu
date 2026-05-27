import { useCallback, useState } from 'react';

import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import type { FireSelectorSlotId } from '@/replicas/fire-selector-layout';
import {
  getMappingEntryForSlot,
  hasDuplicateFcuPositions,
  type SelectorPositionMappingEntry,
  upsertMappingEntry,
} from '@/replicas/selector-mapping';

export type UseFireSelectorAssignResult = {
  assign: (uiSlotId: FireSelectorSlotId) => Promise<string | null>;
  assigning: boolean;
  assigningSlotId: FireSelectorSlotId | null;
  error: string | null;
  clearError: () => void;
};

export function useFireSelectorAssign(
  client: CatnipBleClient | null,
  ready: boolean,
  mapping: SelectorPositionMappingEntry[],
  onMappingChange: (mapping: SelectorPositionMappingEntry[]) => void,
): UseFireSelectorAssignResult {
  const [assigning, setAssigning] = useState(false);
  const [assigningSlotId, setAssigningSlotId] = useState<FireSelectorSlotId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const assign = useCallback(
    async (uiSlotId: FireSelectorSlotId): Promise<string | null> => {
      if (!client || !ready) {
        const message = 'FCU not connected';
        setError(message);
        return message;
      }

      setAssigning(true);
      setAssigningSlotId(uiSlotId);
      setError(null);

      try {
        const fcuPosition = await client.getCurrentFireSelectorPosition();

        const next = upsertMappingEntry(mapping, { uiSlotId, fcuPosition });
        if (hasDuplicateFcuPositions(next)) {
          const message = `Hardware position ${fcuPosition} is already assigned to another switch position`;
          setError(message);
          return message;
        }

        onMappingChange(next);
        return null;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return message;
      } finally {
        setAssigning(false);
        setAssigningSlotId(null);
      }
    },
    [client, mapping, onMappingChange, ready],
  );

  return {
    assign,
    assigning,
    assigningSlotId,
    error,
    clearError,
  };
}

export function slotAssignError(
  mapping: SelectorPositionMappingEntry[],
  uiSlotId: FireSelectorSlotId,
  globalError: string | null,
  assigningSlotId: FireSelectorSlotId | null,
): string | null {
  if (assigningSlotId === uiSlotId && globalError) {
    return globalError;
  }

  const entry = getMappingEntryForSlot(mapping, uiSlotId);
  if (!entry) {
    return null;
  }

  const duplicates = mapping.filter((item) => item.fcuPosition === entry.fcuPosition);
  if (duplicates.length > 1) {
    return `Hardware position ${entry.fcuPosition} is already assigned`;
  }

  return null;
}
