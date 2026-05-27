export { REPLICA_STORAGE_KEY, REPLICA_DB_VERSION, REPLICA_RESERVED_KEYS } from './constants';
export {
  ReplicaNotFoundError,
  ReplicaStorageUnavailableError,
  ReplicaValidationError,
} from './errors';
export {
  loadReplicaDatabase,
  saveReplicaDatabase,
  defaultKeyValueStore,
  type KeyValueStore,
  type ReplicaDatabase,
} from './persistence';
export {
  createReplicaRepository,
  replicaRepository,
  type ReplicaRepository,
} from './repository';
export {
  getFireSelectorPivot,
  getConfiguredFireSelectorTypes,
  CENTER_PIVOT,
  type FireSelectorPivot,
} from './fire-selector-pivot';
export {
  boundsAfterRotationAroundPivot,
  cssTransformAroundPivot,
  pivotToPixel,
  rnTransformAroundPivot,
} from './fire-selector-pivot-math';
export {
  getFireSelectorLayout,
  getGunVisualSlotCount,
  getRequiredMappingCount,
  getSlotsForMapping,
  getWeaponActivePositions,
  needsGunSlotSelection,
  type FireSelectorLayout,
  type FireSelectorSlot,
  type FireSelectorSlotId,
} from './fire-selector-layout';
export {
  getMappingEntryForSlot,
  hasDuplicateFcuPositions,
  isGunSlotSelectionComplete,
  isMappingComplete,
  lookupUiSlotForFcuPosition,
  parseSelectorPositionMapping,
  rotationDegForFcuPosition,
  slotLabelForFcuPosition,
  upsertMappingEntry,
  type SelectorPositionMappingEntry,
} from './selector-mapping';
export {
  getWeaponMetadataFields,
  hasWeaponMetadata,
  isWeaponMetadataComplete,
  WEAPON_METADATA_FIELDS,
  type MetadataChoiceField,
  type MetadataChoiceOption,
  type WeaponMetadataValues,
} from './weapon-metadata';
export {
  REPLICA_TYPES,
  type CreateReplicaInput,
  type Replica,
  type ReplicaCore,
  type ReplicaSummary,
  type ReplicaType,
  type UpdateReplicaInput,
} from './types';
export {
  assertReplicaType,
  normalizeBluetoothMac,
  normalizeFcuName,
  normalizeReplicaName,
  omitReservedKeys,
} from './validation';
