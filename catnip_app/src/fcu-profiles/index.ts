export {
  getMockFireModeSchema,
  MOCK_SUPPORTED_FIRE_MODES,
} from './mock-firemode-schemas';
export {
  addProfile,
  getMockSupportedFireModes,
  getDefaultProfileId,
  getOrCreateCatalog,
  getProfile,
  listProfiles,
  migrateCatalogFromPeripheralId,
  removeProfile,
  setDefaultProfileConfig,
  updateProfile,
} from './mock-store';
export { loadDefaultProfilesFromFcu } from './sync-default-profiles-from-fcu';
export {
  formatUpdateFireModeConfigError,
  resolveProfileById,
  resolveProfileForPosition,
  syncFireModeConfigToFcu,
  syncProfileToFcu,
} from './sync-profile-to-fcu';
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
