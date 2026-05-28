import { useCallback, useEffect, useRef, useState } from 'react';

import {
  formatUpdateFireModeConfigError,
  resolveProfileById,
  resolveProfileForPosition,
} from '@/fcu-profiles';
import type {
  FcuProfileId,
  SelectorPositionProfileAssignment,
} from '@/fcu-profiles';
import type { FireModeName, UpdateFireModeConfigError } from '@/messages/types';

import { useFcuSaveFireModeAssignment } from './use-fcu-fire-mode';

export type UseProfileFcuSyncOptions = {
  peripheralId: string | null;
  compatibilityId: string | null;
};

export type UseProfileFcuSyncResult = {
  syncing: boolean;
  syncError: string | null;
  clearSyncError: () => void;
  pushProfileAtPosition: (
    fcuPosition: number,
    profileId: FcuProfileId,
  ) => Promise<UpdateFireModeConfigError | null>;
  pushConfigAtPosition: (
    fcuPosition: number,
    firemodeName: FireModeName,
    config: Record<string, string>,
  ) => Promise<UpdateFireModeConfigError | null>;
  pushAssignmentForPosition: (
    fcuPosition: number,
    assignments: SelectorPositionProfileAssignment[],
  ) => Promise<UpdateFireModeConfigError | null>;
};

export function useProfileFcuSync({
  peripheralId,
  compatibilityId,
}: UseProfileFcuSyncOptions): UseProfileFcuSyncResult {
  const { save, saving } = useFcuSaveFireModeAssignment(peripheralId);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [queueDepth, setQueueDepth] = useState(0);
  const mountedRef = useRef(true);
  const queueRef = useRef<Promise<UpdateFireModeConfigError | null>>(
    Promise.resolve(null),
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  const enqueue = useCallback(
    (
      task: () => Promise<UpdateFireModeConfigError | null>,
    ): Promise<UpdateFireModeConfigError | null> => {
      setQueueDepth((depth) => depth + 1);
      const next = queueRef.current
        .then(task, task)
        .finally(() => {
          setQueueDepth((depth) => Math.max(0, depth - 1));
        });
      queueRef.current = next.catch(() => null);
      return next;
    },
    [],
  );

  const applyProfileAtPosition = useCallback(
    async (
      fcuPosition: number,
      profileId: FcuProfileId,
    ): Promise<UpdateFireModeConfigError | null> => {
      if (!compatibilityId) {
        const message = 'FCU compatibility id not available';
        setSyncError(message);
        throw new Error(message);
      }

      const profile = await resolveProfileById(compatibilityId, profileId);
      if (!profile) {
        const message = 'Profile not found';
        setSyncError(message);
        throw new Error(message);
      }

      if (mountedRef.current) {
        setSyncError(null);
      }
      try {
        const configOverrides = profile.isDefault ? {} : profile.config;
        const result = await save(fcuPosition, profile.firemodeName, configOverrides);
        if (result !== null && mountedRef.current) {
          setSyncError(formatUpdateFireModeConfigError(result));
        }
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (mountedRef.current) {
          setSyncError(message);
        }
        throw err;
      }
    },
    [compatibilityId, save],
  );

  const pushProfileAtPosition = useCallback(
    (fcuPosition: number, profileId: FcuProfileId) => {
      if (!peripheralId) {
        const message = 'FCU not connected';
        setSyncError(message);
        return Promise.reject(new Error(message));
      }

      return enqueue(() => applyProfileAtPosition(fcuPosition, profileId));
    },
    [applyProfileAtPosition, enqueue, peripheralId],
  );

  const pushConfigAtPosition = useCallback(
    (fcuPosition: number, firemodeName: FireModeName, config: Record<string, string>) => {
      if (!peripheralId) {
        const message = 'FCU not connected';
        setSyncError(message);
        return Promise.reject(new Error(message));
      }

      return enqueue(async () => {
        setSyncError(null);
        try {
          const result = await save(fcuPosition, firemodeName, config);
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
    [enqueue, peripheralId, save],
  );

  const pushAssignmentForPosition = useCallback(
    (fcuPosition: number, assignments: SelectorPositionProfileAssignment[]) => {
      if (!peripheralId || !compatibilityId) {
        const message = 'FCU not connected';
        if (mountedRef.current) {
          setSyncError(message);
        }
        return Promise.reject(new Error(message));
      }

      return enqueue(async () => {
        const profile = await resolveProfileForPosition(
          compatibilityId,
          assignments,
          fcuPosition,
        );
        if (!profile) {
          const message = 'No profile assigned for this selector position';
          if (mountedRef.current) {
            setSyncError(message);
          }
          throw new Error(message);
        }

        return applyProfileAtPosition(fcuPosition, profile.id);
      });
    },
    [applyProfileAtPosition, compatibilityId, enqueue, peripheralId],
  );

  return {
    syncing: saving || queueDepth > 0,
    syncError,
    clearSyncError,
    pushProfileAtPosition,
    pushConfigAtPosition,
    pushAssignmentForPosition,
  };
}
