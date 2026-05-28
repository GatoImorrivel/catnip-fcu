import type { CatnipBleClient } from '@/lib/catnip-ble-client';
import { buildWireConfigForFcu } from '@/lib/firemode-config-utils';
import {
  UpdateFireModeConfigError,
  type FireModeName,
  type UpdateFireModeConfigError as UpdateFireModeConfigErrorType,
} from '@/messages/types';

import { profileIdForPosition } from './assignments';
import { getProfile, listProfiles } from './store';

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

export async function resolveProfileForPosition(
  compatibilityId: string,
  assignments: SelectorPositionProfileAssignment[],
  fcuPosition: number,
): Promise<FcuProfile | null> {
  const profiles = await listProfiles(compatibilityId);
  const profileId =
    profileIdForPosition(assignments, fcuPosition) ?? profiles[0]?.id ?? null;

  if (!profileId) {
    return null;
  }

  return (await getProfile(compatibilityId, profileId)) ?? null;
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

export async function resolveProfileById(
  compatibilityId: string,
  profileId: FcuProfileId,
): Promise<FcuProfile | null> {
  return (await getProfile(compatibilityId, profileId)) ?? null;
}
