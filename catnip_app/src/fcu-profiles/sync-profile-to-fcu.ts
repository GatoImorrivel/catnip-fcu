import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import { buildWireConfigForFcu } from '@/lib/firemode-config-utils';
import {
  UpdateFireModeConfigError,
  type UpdateFireModeConfigError as UpdateFireModeConfigErrorType,
} from '@/messages/types';

import { profileIdForPosition } from './assignments';
import { getProfile, listProfiles } from './mock-store';
import type { FireModeName } from '@/messages/types';

import type {
  FcuProfile,
  FcuProfileId,
  SelectorPositionProfileAssignment,
} from './types';

export function formatUpdateFireModeConfigError(
  error: UpdateFireModeConfigErrorType,
): string {
  switch (error) {
    case UpdateFireModeConfigError.InvalidConfig:
      return 'Invalid fire mode configuration';
    case UpdateFireModeConfigError.UnsupportedFireMode:
      return 'Unsupported fire mode';
    default:
      return 'Failed to update fire mode on FCU';
  }
}

export function resolveProfileForPosition(
  compatibilityId: string,
  assignments: SelectorPositionProfileAssignment[],
  fcuPosition: number,
): FcuProfile | null {
  const profileId =
    profileIdForPosition(assignments, fcuPosition) ??
    listProfiles(compatibilityId)[0]?.id ??
    null;

  if (!profileId) {
    return null;
  }

  return getProfile(compatibilityId, profileId) ?? null;
}

export async function syncFireModeConfigToFcu(
  client: CatnipBleClient,
  fcuPosition: number,
  firemodeName: FireModeName,
  profileConfig: Record<string, string>,
): Promise<UpdateFireModeConfigErrorType | null> {
  const schema = await client.getFireModeConfigFields(firemodeName);
  const config = buildWireConfigForFcu(schema, profileConfig);
  return client.updateFireModeConfig(fcuPosition, firemodeName, config);
}

export async function syncProfileToFcu(
  client: CatnipBleClient,
  fcuPosition: number,
  profile: FcuProfile,
): Promise<UpdateFireModeConfigErrorType | null> {
  return syncFireModeConfigToFcu(
    client,
    fcuPosition,
    profile.firemodeName,
    profile.config,
  );
}

export function resolveProfileById(
  compatibilityId: string,
  profileId: FcuProfileId,
): FcuProfile | null {
  return getProfile(compatibilityId, profileId) ?? null;
}
