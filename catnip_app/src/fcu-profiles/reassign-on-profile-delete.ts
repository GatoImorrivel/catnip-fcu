import {
  defaultKeyValueStore,
  loadReplicaDatabase,
  saveReplicaDatabase,
  type KeyValueStore,
} from '@/replicas/persistence';

import { parseSelectorPositionProfiles } from './assignments';
import type { FcuProfileId } from './types';

/**
 * Updates every replica on `compatibilityId` that referenced `deletedProfileId`
 * to use `replacementProfileId` instead.
 */
export async function reassignReplicasAfterProfileDelete(
  compatibilityId: string,
  deletedProfileId: FcuProfileId,
  replacementProfileId: FcuProfileId,
  store: KeyValueStore = defaultKeyValueStore,
): Promise<void> {
  const replicaDb = await loadReplicaDatabase(store);
  let dirty = false;

  for (const replica of Object.values(replicaDb.replicas)) {
    if (replica.fcuCompatibilityId !== compatibilityId) {
      continue;
    }

    const assignments = parseSelectorPositionProfiles(replica);
    let changed = false;
    const next = assignments.map((entry) => {
      if (entry.profileId !== deletedProfileId) {
        return entry;
      }
      changed = true;
      return { ...entry, profileId: replacementProfileId };
    });

    if (!changed) {
      continue;
    }

    replicaDb.replicas[replica.id] = {
      ...replica,
      selectorPositionProfiles: next,
      updatedAt: new Date().toISOString(),
    };
    dirty = true;
  }

  if (dirty) {
    await saveReplicaDatabase(replicaDb, store);
  }
}
