import type { FireModeName } from '@/messages/types';

export type FcuProfileId = string;

export type FcuProfile = {
  id: FcuProfileId;
  /** User-visible profile name (unique per FCU, including default profiles). */
  name: string;
  firemodeName: FireModeName;
  config: Record<string, string>;
  isDefault: boolean;
};

/** Per FCU catalog of profiles (shared across replicas on same MAC). */
export type FcuProfileCatalog = {
  fcuId: string;
  profiles: FcuProfile[];
};

/** Per replica: which profile is used at each FCU hardware position. */
export type SelectorPositionProfileAssignment = {
  fcuPosition: number;
  profileId: FcuProfileId;
};

export const NEW_PROFILE_OPTION_VALUE = '__new__' as const;
