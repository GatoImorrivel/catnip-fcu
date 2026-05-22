pub use catnip_core::*;
pub mod fire_selector;

pub trait ESP32FCU: FCUConfig {
    fn routine(&mut self) -> anyhow::Result<()>;
}