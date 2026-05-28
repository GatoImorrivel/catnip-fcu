import {
  acquireFcuSession,
  releaseFcuSession,
  waitForFcuSessionReady,
} from '@/lib/fcu-connection-session';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';

import type { SelectorPositionProfileAssignment } from './types';
import { getDefaultProfileId, getOrCreateCatalog, setDefaultProfileConfig } from './mock-store';

/**
 * Reads fire mode + config from the FCU for each mapped hardware position, updates
 * the in-memory default profiles for that compatibility family, and returns position assignments.
 */
export async function loadDefaultProfilesFromFcu(
  peripheralId: string,
  compatibilityId: string,
  mapping: SelectorPositionMappingEntry[],
): Promise<SelectorPositionProfileAssignment[]> {
  if (mapping.length === 0) {
    return [];
  }

  getOrCreateCatalog(compatibilityId);
  acquireFcuSession(peripheralId);

  try {
    const client = await waitForFcuSessionReady(peripheralId);
    const assignments: SelectorPositionProfileAssignment[] = [];

    for (const entry of mapping) {
      const positionConfig = await client.getFireModeForPosition(entry.fcuPosition);
      setDefaultProfileConfig(compatibilityId, positionConfig.firemode_name, positionConfig.config);
      assignments.push({
        fcuPosition: entry.fcuPosition,
        profileId: getDefaultProfileId(compatibilityId, positionConfig.firemode_name),
      });
    }

    return assignments;
  } finally {
    releaseFcuSession(peripheralId);
  }
}
