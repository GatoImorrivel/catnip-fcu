import { useEffect, useMemo, useReducer } from 'react';

import { migrateCatalogFromPeripheralId } from '@/fcu-profiles';
import {
  getFcuSessionCharacteristics,
  subscribeFcuSession,
} from '@/lib/fcu-connection-session';
import { normalizeCompatibilityId } from '@/lib/fcu-compatibility';

/**
 * Resolves the profile catalog key for an FCU: live {@link Characteristics.compatibility_id}
 * when connected, otherwise the value stored on the replica.
 */
export function useFcuProfileCatalogKey(
  peripheralId: string | null,
  storedCompatibilityId: string | null | undefined,
): string | null {
  const [, bumpSession] = useReducer((version: number) => version + 1, 0);

  useEffect(() => {
    if (!peripheralId) {
      return;
    }
    return subscribeFcuSession(peripheralId, () => {
      bumpSession();
    });
  }, [peripheralId]);

  const compatibilityId = useMemo(() => {
    const live = peripheralId
      ? getFcuSessionCharacteristics(peripheralId)?.compatibility_id
      : undefined;
    const candidate = (live ?? storedCompatibilityId ?? '').trim();
    if (!candidate) {
      return null;
    }
    try {
      return normalizeCompatibilityId(candidate);
    } catch {
      return null;
    }
  }, [peripheralId, storedCompatibilityId]);

  useEffect(() => {
    if (peripheralId && compatibilityId) {
      migrateCatalogFromPeripheralId(peripheralId, compatibilityId);
    }
  }, [compatibilityId, peripheralId]);

  return compatibilityId;
}
