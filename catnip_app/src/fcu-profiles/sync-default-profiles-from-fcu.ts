import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import { defaultWireValuesFromSchema } from '@/lib/firemode-config-utils';
import {
  acquireFcuSession,
  releaseFcuSession,
  waitForFcuSessionReady,
} from '@/lib/fcu-connection-session';
import type { SelectorPositionMappingEntry } from '@/replicas/selector-mapping';

import type { SelectorPositionProfileAssignment } from './types';
import { getDefaultProfileId, getOrCreateCatalog, setDefaultProfileConfig } from './store';

/** Persists FCU schema factory defaults for every supported fire mode. */
export async function refreshDefaultProfileConfigsFromFcu(
  client: CatnipBleClient,
  compatibilityId: string,
): Promise<void> {
  const firemodes = await client.getSupportedFireModes();
  for (const firemodeName of firemodes) {
    const schema = await client.getFireModeConfigFields(firemodeName);
    await setDefaultProfileConfig(
      compatibilityId,
      firemodeName,
      defaultWireValuesFromSchema(schema),
    );
  }
}

/**
 * Refreshes default profile configs from FCU schema, reads fire mode per mapped position,
 * and returns position assignments.
 */
export async function loadDefaultProfilesFromFcu(
  peripheralId: string,
  compatibilityId: string,
  mapping: SelectorPositionMappingEntry[],
): Promise<SelectorPositionProfileAssignment[]> {
  if (mapping.length === 0) {
    return [];
  }

  await getOrCreateCatalog(compatibilityId);
  acquireFcuSession(peripheralId);

  try {
    const client = await waitForFcuSessionReady(peripheralId);
    await refreshDefaultProfileConfigsFromFcu(client, compatibilityId);

    const assignments: SelectorPositionProfileAssignment[] = [];
    for (const entry of mapping) {
      const positionConfig = await client.getFireModeForPosition(entry.fcuPosition);
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
