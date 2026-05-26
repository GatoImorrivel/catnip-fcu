pub mod ble;
pub mod firemode;
pub mod protocol;
pub mod requests;

use std::{collections::HashMap, time::Instant};

pub use ble::{
    CATNIP_FCU_ADV_MAGIC, CATNIP_FCU_SERVICE_UUID, FCU_TO_HOST_UUID, HOST_TO_FCU_UUID,
    catnip_manufacturer_data,
};
use serde::{Serialize, de::DeserializeOwned};

use crate::firemode::{FireModeConfig, FireModeConfigField};

pub type FireSelectorPosition = usize;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Characteristics {
    pub num_fire_positions: u8,
    pub name: String,
    pub kind: FCUKind,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum FCUKind {
    HPA { num_solenoids: u8 },
    AEG,
}

pub enum FireResult {
    Skipped,
    Shot,
}

pub trait FCU {
    type FireModesConfigs: TryFrom<(Self::FireModes, HashMap<String, String>), Error = anyhow::Error>
        + Into<HashMap<String, String>>;
    type FireModes: TryFrom<String, Error = anyhow::Error> + Into<String> + Clone;
    fn characteristics(&self) -> Characteristics;
    fn poll_selector_position(&mut self) -> anyhow::Result<FireSelectorPosition>;
    fn fire_cycle(
        &mut self,
        firemode: Self::FireModes,
        config: Self::FireModesConfigs,
        last_shot_instant: Instant,
        now: Instant,
    ) -> anyhow::Result<FireResult>;
    fn get_supported_firemodes(&self) -> Vec<Self::FireModes>;
    fn get_firemode_fields(&self, firemode: Self::FireModes) -> Vec<FireModeConfigField>;
    fn get_firemode_for_position(
        &self,
        selector_position: FireSelectorPosition,
    ) -> (Self::FireModes, Self::FireModesConfigs);
    fn update_firemode_for_position(
        &mut self,
        selector_position: FireSelectorPosition,
        firemode: Self::FireModes,
        config: Self::FireModesConfigs,
    ) -> anyhow::Result<()>;
}

pub trait FireSelector {
    /// Current selector value: bit *i* is set when position *i* is active.
    fn read(&self) -> FireSelectorPosition;
    fn position_count(&self) -> usize;
}

pub trait FireModeConfigStorage {
    fn save_firemode_config(&self, config: &impl FireModeConfig) -> anyhow::Result<()>;
    fn load_firemode_config(&self, fire_selector_position: usize) -> anyhow::Result<()>;
}
