export {
  getMockFireModeSchema,
  MOCK_SUPPORTED_FIRE_MODES,
} from './mock-firemode-schemas';
export {
  clearProfileDatabaseForTests,
  loadProfileDatabase,
  saveProfileDatabase,
} from './persistence';
export {
  addProfile,
  getMockSupportedFireModes,
  getDefaultProfileId,
  getOrCreateCatalog,
  getProfile,
  invalidateProfileStoreCache,
  listProfiles,
  removeProfile,
  setDefaultProfileConfig,
  updateProfile,
} from './store';
export {
  loadDefaultProfilesFromFcu,
  refreshDefaultProfileConfigsFromFcu,
} from './sync-default-profiles-from-fcu';
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
  assertUniqueProfileNameInProfiles,
  getProfileDisplayName,
  isProfileNameTaken,
  isProfileNameTakenInProfiles,
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
