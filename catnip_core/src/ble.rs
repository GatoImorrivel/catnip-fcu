//! Catnip FCU BLE GATT profile and advertising layout.
//!
//! Required for BLE GATT peripheral implementations that interoperate with Catnip hosts.
//! Other [`crate::protocol::Transport`] backends (serial, etc.) do not use these constants.

/// Primary Catnip FCU GATT service. Host apps should scan/filter on this UUID.
pub const CATNIP_FCU_SERVICE_UUID: u128 = 0x6f6e6963_74617000_00000000_00000001;
/// Host → FCU requests (write).
pub const HOST_TO_FCU_UUID: u128 = 0x6f6e6963_74617000_00000000_00000002;
/// FCU → Host replies and push events (notify).
pub const FCU_TO_HOST_UUID: u128 = 0x6f6e6963_74617000_00000000_00000003;

/// Magic tag in manufacturer data; host UIs can match this to identify Catnip-protocol devices.
pub const CATNIP_FCU_ADV_MAGIC: [u8; 4] = *b"CNFC";

/// Manufacturer-specific advertising payload: `[company_id LE][CATNIP_FCU_ADV_MAGIC]`.
///
/// `manufacturer_id` is chosen by the product firmware (often a Bluetooth SIG company ID).
pub fn catnip_manufacturer_data(manufacturer_id: u16) -> Vec<u8> {
    let mut data = Vec::with_capacity(6);
    data.extend_from_slice(&manufacturer_id.to_le_bytes());
    data.extend_from_slice(&CATNIP_FCU_ADV_MAGIC);
    data
}
