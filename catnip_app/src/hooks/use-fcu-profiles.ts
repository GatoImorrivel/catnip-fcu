import { useCallback, useEffect, useState } from 'react';

import {
  addProfile,
  getMockFireModeSchema,
  getMockSupportedFireModes,
  getProfile,
  listProfiles,
  removeProfile,
  updateProfile,
  type FcuProfile,
  type FcuProfileId,
} from '@/fcu-profiles';
import { defaultWireValuesFromSchema } from '@/lib/firemode-config-utils';
import type { FireModeName } from '@/messages/types';

export type UseFcuProfilesResult = {
  profiles: FcuProfile[];
  loading: boolean;
  error: string | null;
  supportedFireModes: FireModeName[];
  version: number;
  refresh: () => Promise<void>;
  getProfileById: (profileId: FcuProfileId) => FcuProfile | undefined;
  createCustomProfile: (
    name: string,
    firemodeName: FireModeName,
    config: Record<string, string>,
  ) => Promise<FcuProfile>;
  updateCustomProfile: (
    profileId: FcuProfileId,
    config: Record<string, string>,
  ) => Promise<FcuProfile>;
  deleteCustomProfile: (profileId: FcuProfileId) => Promise<void>;
  getSchemaForFireMode: (firemodeName: FireModeName) => ReturnType<typeof getMockFireModeSchema>;
  defaultConfigForFireMode: (firemodeName: FireModeName) => Record<string, string>;
};

export function useFcuProfiles(compatibilityId: string | null): UseFcuProfilesResult {
  const [profiles, setProfiles] = useState<FcuProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    if (!compatibilityId) {
      setProfiles([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setProfiles(await listProfiles(compatibilityId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [compatibilityId]);

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  const bump = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  const getProfileById = useCallback(
    (profileId: FcuProfileId) => {
      return profiles.find((profile) => profile.id === profileId);
    },
    [profiles],
  );

  const createCustomProfile = useCallback(
    async (name: string, firemodeName: FireModeName, config: Record<string, string>) => {
      if (!compatibilityId) {
        throw new Error('FCU compatibility id not available');
      }
      const created = await addProfile(compatibilityId, {
        name,
        firemodeName,
        config,
        isDefault: false,
      });
      bump();
      return created;
    },
    [bump, compatibilityId],
  );

  const updateCustomProfile = useCallback(
    async (profileId: FcuProfileId, config: Record<string, string>) => {
      if (!compatibilityId) {
        throw new Error('FCU compatibility id not available');
      }
      const updated = await updateProfile(compatibilityId, profileId, config);
      bump();
      return updated;
    },
    [bump, compatibilityId],
  );

  const deleteCustomProfile = useCallback(
    async (profileId: FcuProfileId) => {
      if (!compatibilityId) {
        throw new Error('FCU compatibility id not available');
      }
      await removeProfile(compatibilityId, profileId);
      bump();
    },
    [bump, compatibilityId],
  );

  const getSchemaForFireMode = useCallback((firemodeName: FireModeName) => {
    return getMockFireModeSchema(firemodeName);
  }, []);

  const defaultConfigForFireMode = useCallback((firemodeName: FireModeName) => {
    return defaultWireValuesFromSchema(getMockFireModeSchema(firemodeName));
  }, []);

  return {
    profiles,
    loading,
    error,
    supportedFireModes: getMockSupportedFireModes(),
    version,
    refresh,
    getProfileById,
    createCustomProfile,
    updateCustomProfile,
    deleteCustomProfile,
    getSchemaForFireMode,
    defaultConfigForFireMode,
  };
}
