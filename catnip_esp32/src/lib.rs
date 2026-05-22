pub use catnip_core::*;
pub mod fire_selector;
pub mod server;

#[cfg(all(
    feature = "bt",
))]
mod bt_transport;

#[cfg(all(
    feature = "bt",
))]
pub use bt_transport::{
    BluetoothTransport, BluetoothTransportConfig, CATNIP_FCU_ADV_MAGIC,
    CATNIP_FCU_MANUFACTURER_ID, CATNIP_FCU_SERVICE_UUID, FCU_TO_HOST_UUID,
    HOST_TO_FCU_UUID, catnip_fcu_manufacturer_data,
};

pub trait ESP32FCU: FCUConfig {
    fn routine(&mut self) -> anyhow::Result<()>;
}