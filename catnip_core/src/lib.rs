pub mod ble;
#[macro_use]
pub mod firemode;
pub mod protocol;
pub mod requests;

use std::time::Instant;

pub use ble::{
    CATNIP_FCU_ADV_MAGIC, CATNIP_FCU_SERVICE_UUID, FCU_TO_HOST_UUID, HOST_TO_FCU_UUID,
    catnip_manufacturer_data,
};

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
    type FireMode: firemode::FireMode + firemode::PersistableFireModeAssignment;

    fn characteristics(&self) -> Characteristics;
    fn poll_selector_position(&mut self) -> anyhow::Result<FireSelectorPosition>;
    fn assignment_for_position(&self, position: FireSelectorPosition) -> Self::FireMode;
    fn set_assignment(
        &mut self,
        position: FireSelectorPosition,
        mode: Self::FireMode,
    ) -> anyhow::Result<()>;
    fn supported_modes(&self) -> Vec<Self::FireMode>;
    fn fire_cycle(
        &mut self,
        mode: Self::FireMode,
        last_shot_instant: Instant,
        now: Instant,
    ) -> anyhow::Result<FireResult>;
}

pub trait FireSelector {
    /// Current selector value: bit *i* is set when position *i* is active.
    fn read(&self) -> FireSelectorPosition;
    fn position_count(&self) -> usize;
}

pub trait PositionAssignmentStorage {
    fn save_assignment(
        &self,
        position: usize,
        assignment: &impl serde::Serialize,
    ) -> anyhow::Result<()>;
    fn load_assignment<M: serde::de::DeserializeOwned>(
        &self,
        position: usize,
    ) -> anyhow::Result<Option<M>>;
}
