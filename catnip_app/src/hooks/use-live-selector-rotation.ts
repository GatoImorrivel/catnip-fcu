import { useCallback, useEffect, useState } from 'react';

import { useCatnipFcu, type CatnipFcuStatus } from '@/hooks/use-catnip-fcu';
import { formatFireModeName } from '@/messages/types';
import {
  rotationDegForFcuPosition,
  slotLabelForFcuPosition,
  type SelectorPositionMappingEntry,
} from '@/replicas/selector-mapping';
import type { ReplicaType } from '@/replicas/types';

export type UseLiveSelectorRotationResult = {
  rotationDeg: number;
  slotLabel: string | null;
  fireModeLabel: string | null;
  fireModeLoading: boolean;
  fireModeFailed: boolean;
  isUnmapped: boolean;
  fcuPosition: number | null;
  connectionStatus: CatnipFcuStatus;
  error: string | null;
  ready: boolean;
  reconnect: () => void;
};

export type UseLiveSelectorRotationOptions = {
  /** When false, skips `getFireModeForPosition` (e.g. profile picker on detail screen). */
  fetchFireModeLabel?: boolean;
};

export function useLiveSelectorRotation(
  peripheralId: string | null,
  replicaType: ReplicaType,
  mapping: SelectorPositionMappingEntry[],
  options: UseLiveSelectorRotationOptions = {},
): UseLiveSelectorRotationResult {
  const fetchFireModeLabel = options.fetchFireModeLabel ?? true;
  const [rotationDeg, setRotationDeg] = useState(0);
  const [slotLabel, setSlotLabel] = useState<string | null>(null);
  const [isUnmapped, setIsUnmapped] = useState(false);
  const [fcuPosition, setFcuPosition] = useState<number | null>(null);
  const [fireModeLabel, setFireModeLabel] = useState<string | null>(null);
  const [fireModeLoading, setFireModeLoading] = useState(false);
  const [fireModeFailed, setFireModeFailed] = useState(false);

  const applyFcuPosition = useCallback(
    (position: number) => {
      setFcuPosition(position);

      const deg = rotationDegForFcuPosition(replicaType, mapping, position);
      const label = slotLabelForFcuPosition(replicaType, mapping, position);

      if (deg !== null) {
        setRotationDeg(deg);
        setSlotLabel(label);
        setIsUnmapped(false);
        return;
      }

      setSlotLabel(null);
      setIsUnmapped(true);
      setFireModeLabel(null);
      setFireModeLoading(false);
      setFireModeFailed(false);
    },
    [mapping, replicaType],
  );

  const { client, status, error, ready, reconnect } = useCatnipFcu(peripheralId, {
    onEvent: (event) => {
      if (event.tag === 'SelectorPositionChange') {
        applyFcuPosition(event.position);
      }
    },
  });

  useEffect(() => {
    if (!client || !ready) {
      return;
    }

    let cancelled = false;

    void client
      .getCurrentFireSelectorPosition()
      .then((position) => {
        if (!cancelled) {
          applyFcuPosition(position);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [applyFcuPosition, client, ready]);

  useEffect(() => {
    if (!fetchFireModeLabel || !client || !ready || fcuPosition === null || isUnmapped) {
      return;
    }

    let cancelled = false;
    setFireModeLoading(true);
    setFireModeFailed(false);

    void client
      .getFireModeForPosition(fcuPosition)
      .then((config) => {
        if (!cancelled) {
          setFireModeLabel(formatFireModeName(config.firemode_name));
          setFireModeLoading(false);
          setFireModeFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFireModeLabel(null);
          setFireModeLoading(false);
          setFireModeFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, fcuPosition, fetchFireModeLabel, isUnmapped, ready]);

  return {
    rotationDeg,
    slotLabel,
    fireModeLabel,
    fireModeLoading,
    fireModeFailed,
    isUnmapped,
    fcuPosition,
    connectionStatus: status,
    error,
    ready,
    reconnect,
  };
}
