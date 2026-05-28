import type { FireModeName } from '@/messages/types';

export type FcuProfileId = string;

export type FcuProfile = {
  id: FcuProfileId;
  /** User-visible profile name (unique per compatibility family, including defaults). */
  name: string;
  firemodeName: FireModeName;
  config: Record<string, string>;
  isDefault: boolean;
};

/** Profile catalog shared by all FCUs with the same {@link compatibilityId}. */
export type FcuProfileCatalog = {
  compatibilityId: string;
  profiles: FcuProfile[];
};

/** Per replica: which profile is used at each FCU hardware position. */
export type SelectorPositionProfileAssignment = {
  fcuPosition: number;
  profileId: FcuProfileId;
};

export const NEW_PROFILE_OPTION_VALUE = '__new__' as const;
