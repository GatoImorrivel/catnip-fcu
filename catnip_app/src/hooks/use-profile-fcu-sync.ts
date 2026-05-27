import { useCallback, useRef, useState } from 'react';

import {
  formatUpdateFireModeConfigError,
  resolveProfileById,
  resolveProfileForPosition,
} from '@/fcu-profiles';
import type {
  FcuProfileId,
  SelectorPositionProfileAssignment,
} from '@/fcu-profiles';
import type { UpdateFireModeConfigError } from '@/messages/types';

import { useFcuSaveFireModeAssignment } from './use-fcu-fire-mode';

export type UseProfileFcuSyncResult = {
  syncing: boolean;
  syncError: string | null;
  clearSyncError: () => void;
  pushProfileAtPosition: (
    fcuPosition: number,
    profileId: FcuProfileId,
  ) => Promise<UpdateFireModeConfigError | null>;
  pushAssignmentForPosition: (
    fcuPosition: number,
    assignments: SelectorPositionProfileAssignment[],
  ) => Promise<UpdateFireModeConfigError | null>;
};

export function useProfileFcuSync(fcuId: string | null): UseProfileFcuSyncResult {
  const { save, saving } = useFcuSaveFireModeAssignment(fcuId);
  const [syncError, setSyncError] = useState<string | null>(null);
  const queueRef = useRef<Promise<UpdateFireModeConfigError | null>>(
    Promise.resolve(null),
  );

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  const enqueue = useCallback(
    (
      task: () => Promise<UpdateFireModeConfigError | null>,
    ): Promise<UpdateFireModeConfigError | null> => {
      const next = queueRef.current.then(task, task);
      queueRef.current = next.catch(() => null);
      return next;
    },
    [],
  );

  const pushProfileAtPosition = useCallback(
    (fcuPosition: number, profileId: FcuProfileId) => {
      if (!fcuId) {
        const message = 'FCU not connected';
        setSyncError(message);
        return Promise.reject(new Error(message));
      }

      const profile = resolveProfileById(fcuId, profileId);
      if (!profile) {
        const message = 'Profile not found';
        setSyncError(message);
        return Promise.reject(new Error(message));
      }

      return enqueue(async () => {
        setSyncError(null);
        try {
          const result = await save(fcuPosition, profile.firemodeName, profile.config);
          if (result !== null) {
            setSyncError(formatUpdateFireModeConfigError(result));
          }
          return result;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setSyncError(message);
          throw err;
        }
      });
    },
    [enqueue, fcuId, save],
  );

  const pushAssignmentForPosition = useCallback(
    (fcuPosition: number, assignments: SelectorPositionProfileAssignment[]) => {
      if (!fcuId) {
        return Promise.resolve(null);
      }

      const profile = resolveProfileForPosition(fcuId, assignments, fcuPosition);
      if (!profile) {
        return Promise.resolve(null);
      }

      return pushProfileAtPosition(fcuPosition, profile.id);
    },
    [fcuId, pushProfileAtPosition],
  );

  return {
    syncing: saving,
    syncError,
    clearSyncError,
    pushProfileAtPosition,
    pushAssignmentForPosition,
  };
}
