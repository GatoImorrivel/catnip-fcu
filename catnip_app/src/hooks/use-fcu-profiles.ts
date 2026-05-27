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

export function useFcuProfiles(fcuId: string | null): UseFcuProfilesResult {
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  const profiles = useMemo(() => {
    if (!fcuId) {
      return [];
    }
    void version;
    return listProfiles(fcuId);
  }, [fcuId, version]);

  const getProfileById = useCallback(
    (profileId: FcuProfileId) => {
      if (!fcuId) {
        return undefined;
      }
      return getProfile(fcuId, profileId);
    },
    [fcuId, version],
  );

  const createCustomProfile = useCallback(
    (name: string, firemodeName: FireModeName, config: Record<string, string>) => {
      if (!fcuId) {
        throw new Error('FCU not connected');
      }
      const created = addProfile(fcuId, { name, firemodeName, config, isDefault: false });
      bump();
      return created;
    },
    [bump, fcuId],
  );

  const updateCustomProfile = useCallback(
    (profileId: FcuProfileId, config: Record<string, string>) => {
      if (!fcuId) {
        throw new Error('FCU not connected');
      }
      const updated = updateProfile(fcuId, profileId, config);
      bump();
      return updated;
    },
    [bump, fcuId],
  );

  const deleteCustomProfile = useCallback(
    (profileId: FcuProfileId) => {
      if (!fcuId) {
        throw new Error('FCU not connected');
      }
      removeProfile(fcuId, profileId);
      bump();
    },
    [bump, fcuId],
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
