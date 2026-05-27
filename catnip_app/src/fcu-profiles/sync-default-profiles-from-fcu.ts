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
 * the in-memory default profiles for that FCU, and returns position assignments.
 */
export async function loadDefaultProfilesFromFcu(
  fcuId: string,
  mapping: SelectorPositionMappingEntry[],
): Promise<SelectorPositionProfileAssignment[]> {
  if (mapping.length === 0) {
    return [];
  }

  getOrCreateCatalog(fcuId);
  acquireFcuSession(fcuId);

  try {
    const client = await waitForFcuSessionReady(fcuId);
    const assignments: SelectorPositionProfileAssignment[] = [];

    for (const entry of mapping) {
      const positionConfig = await client.getFireModeForPosition(entry.fcuPosition);
      setDefaultProfileConfig(fcuId, positionConfig.firemode_name, positionConfig.config);
      assignments.push({
        fcuPosition: entry.fcuPosition,
        profileId: getDefaultProfileId(fcuId, positionConfig.firemode_name),
      });
    }

    return assignments;
  } finally {
    releaseFcuSession(fcuId);
  }
}
