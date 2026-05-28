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
  graphicOffsetForPivotRotation,
  pivotToPixel,
  rnTransformAroundPivot,
  rotatedAabbAroundPivot,
} from './fire-selector-pivot-math';
export {
  FIRE_SELECTOR_LAYOUT_INSET_RATIO,
  getFireSelectorAspect,
  getFireSelectorReplicaConfig,
  type FireSelectorReplicaConfig,
} from './fire-selector-replica-config';
export {
  buildRotationSamples,
  computeSweptLayout,
  computeSweptLayoutForReplica,
  getDefaultSweptBounds,
  getRotationSamplesForReplica,
  maxScaleForContainer,
  maxScaleForReplica,
  REFERENCE_GRAPHIC_SCALE,
  scaleToFitMaxBox,
  type SweptLayoutResult,
} from './fire-selector-sweep';
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
  assignFcuPositionToSlot,
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
