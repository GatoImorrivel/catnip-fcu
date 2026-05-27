export {
  getMockFireModeSchema,
  MOCK_SUPPORTED_FIRE_MODES,
} from './mock-firemode-schemas';
export {
  addProfile,
  getMockSupportedFireModes,
  getOrCreateCatalog,
  getProfile,
  listProfiles,
  removeProfile,
  updateProfile,
} from './mock-store';
export {
  parseSelectorPositionProfiles,
  profileIdForPosition,
  upsertPositionProfileAssignment,
} from './assignments';
export {
  assertUniqueProfileName,
  getProfileDisplayName,
  isProfileNameTaken,
  normalizeProfileName,
  validateProfileName,
} from './profile-names';
export {
  NEW_PROFILE_OPTION_VALUE,
  type FcuProfile,
  type FcuProfileCatalog,
  type FcuProfileId,
  type SelectorPositionProfileAssignment,
} from './types';
