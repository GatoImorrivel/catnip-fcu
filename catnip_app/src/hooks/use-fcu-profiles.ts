import { useCallback, useMemo, useState } from 'react';

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
  supportedFireModes: FireModeName[];
  version: number;
  getProfileById: (profileId: FcuProfileId) => FcuProfile | undefined;
  createCustomProfile: (
    name: string,
    firemodeName: FireModeName,
    config: Record<string, string>,
  ) => FcuProfile;
  updateCustomProfile: (
    profileId: FcuProfileId,
    config: Record<string, string>,
  ) => FcuProfile;
  deleteCustomProfile: (profileId: FcuProfileId) => void;
  getSchemaForFireMode: (firemodeName: FireModeName) => ReturnType<typeof getMockFireModeSchema>;
  defaultConfigForFireMode: (firemodeName: FireModeName) => Record<string, string>;
};

export function useFcuProfiles(compatibilityId: string | null): UseFcuProfilesResult {
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  const profiles = useMemo(() => {
    if (!compatibilityId) {
      return [];
    }
    void version;
    return listProfiles(compatibilityId);
  }, [compatibilityId, version]);

  const getProfileById = useCallback(
    (profileId: FcuProfileId) => {
      if (!compatibilityId) {
        return undefined;
      }
      return getProfile(compatibilityId, profileId);
    },
    [compatibilityId, version],
  );

  const createCustomProfile = useCallback(
    (name: string, firemodeName: FireModeName, config: Record<string, string>) => {
      if (!compatibilityId) {
        throw new Error('FCU compatibility id not available');
      }
      const created = addProfile(compatibilityId, {
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
    (profileId: FcuProfileId, config: Record<string, string>) => {
      if (!compatibilityId) {
        throw new Error('FCU compatibility id not available');
      }
      const updated = updateProfile(compatibilityId, profileId, config);
      bump();
      return updated;
    },
    [bump, compatibilityId],
  );

  const deleteCustomProfile = useCallback(
    (profileId: FcuProfileId) => {
      if (!compatibilityId) {
        throw new Error('FCU compatibility id not available');
      }
      removeProfile(compatibilityId, profileId);
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
    supportedFireModes: getMockSupportedFireModes(),
    version,
    getProfileById,
    createCustomProfile,
    updateCustomProfile,
    deleteCustomProfile,
    getSchemaForFireMode,
    defaultConfigForFireMode,
  };
}
