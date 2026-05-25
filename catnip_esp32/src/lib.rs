pub use catnip_core::*;
pub mod fire_selector;
pub mod server;

mod bt_transport;

pub use bt_transport::{
    BluetoothTransport, BluetoothTransportConfig, CATNIP_FCU_REFERENCE_MANUFACTURER_ID,
};

pub trait ESP32FCU: FCUConfig {
    fn routine(&mut self) -> anyhow::Result<()>;
}