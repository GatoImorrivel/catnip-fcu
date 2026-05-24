import { BleScanMode, type Peripheral, type ScanOptions } from 'react-native-ble-manager';

/** Matches `catnip_esp32::bt_transport::CATNIP_FCU_SERVICE_UUID`. */
export const CATNIP_FCU_SERVICE_UUID = '6f6e6963-7461-7000-0000-000000000001';

/** Matches `catnip_esp32::bt_transport::HOST_TO_FCU_UUID`. */
export const HOST_TO_FCU_UUID = '6f6e6963-7461-7000-0000-000000000002';

/** Matches `catnip_esp32::bt_transport::FCU_TO_HOST_UUID`. */
export const FCU_TO_HOST_UUID = '6f6e6963-7461-7000-0000-000000000003';

/** Matches `catnip_esp32::bt_transport::CATNIP_FCU_MANUFACTURER_ID`. */
export const CATNIP_FCU_MANUFACTURER_ID = 0x0cfc;

/** Matches `catnip_esp32::bt_transport::CATNIP_FCU_ADV_MAGIC` (`b"CNFC"`). */
export const CATNIP_FCU_ADV_MAGIC = [0x43, 0x4e, 0x46, 0x43] as const;

/**
 * No hardware scan filters — Android OEM filters often drop valid Catnip ADV
 * packets (128-bit UUID layout). FCU identification is done in software via
 * {@link isCatnipFcuPeripheral}.
 */
export const DEFAULT_CATNIP_SCAN_OPTIONS: ScanOptions = {
  allowDuplicates: true,
  scanMode: BleScanMode.LowLatency,
};

function normalizeUuid(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}

function magicMatches(bytes: number[], offset: number): boolean {
  return CATNIP_FCU_ADV_MAGIC.every((byte, index) => bytes[offset + index] === byte);
}

/** Parse company id + magic from Android manufacturer advertising bytes. */
export function parseCatnipManufacturer(bytes: number[]): {
  companyId: number;
  hasMagic: boolean;
} | null {
  if (bytes.length >= 6) {
    // Standard AD layout: company id LE then payload.
    const companyId = bytes[0]! | (bytes[1]! << 8);
    return {
      companyId,
      hasMagic: magicMatches(bytes, 2),
    };
  }

  if (bytes.length === 4) {
    // react-native-ble-manager map entry: magic only (key is company id).
    return {
      companyId: CATNIP_FCU_MANUFACTURER_ID,
      hasMagic: magicMatches(bytes, 0),
    };
  }

  // Android manufacturerRawData: 4-byte BE int prefix + payload from DefaultPeripheral.
  if (bytes.length >= 8 && bytes[0] === 0 && bytes[1] === 0) {
    const companyId = bytes[3]! | (bytes[2]! << 8);
    return {
      companyId,
      hasMagic: magicMatches(bytes, 4),
    };
  }

  return null;
}

export function getManufacturerBytes(peripheral: Peripheral): number[] | null {
  const advertising = peripheral.advertising;
  if (advertising.manufacturerRawData?.bytes?.length) {
    return advertising.manufacturerRawData.bytes;
  }

  const manufacturerData = advertising.manufacturerData;
  if (!manufacturerData) {
    return null;
  }

  for (const entry of Object.values(manufacturerData)) {
    if (entry.bytes?.length) {
      return entry.bytes;
    }
  }

  return null;
}

export function isCatnipFcuPeripheral(peripheral: Peripheral): boolean {
  const serviceUuids = peripheral.advertising.serviceUUIDs ?? [];
  const hasService = serviceUuids.some(
    (uuid) => normalizeUuid(uuid) === normalizeUuid(CATNIP_FCU_SERVICE_UUID),
  );
  if (hasService) {
    return true;
  }

  const manufacturerBytes = getManufacturerBytes(peripheral);
  if (!manufacturerBytes) {
    return false;
  }

  const parsed = parseCatnipManufacturer(manufacturerBytes);
  return (
    parsed !== null &&
    parsed.companyId === CATNIP_FCU_MANUFACTURER_ID &&
    parsed.hasMagic
  );
}
