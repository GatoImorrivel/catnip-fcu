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

/// Static description of an FCU returned by [`HostToFCURequest::GetCharacteristcs`].
///
/// Host apps use this to configure UI (selector positions, platform kind) and to decide
/// whether fire-mode profiles are interchangeable across devices.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Characteristics {
    pub num_fire_positions: u8,
    /// Human-readable label for this unit (often matches the BLE advertised name).
    pub name: String,
    pub kind: FCUKind,
    /// Stable firmware-family key for profile and fire-mode compatibility.
    ///
    /// Two FCUs with the same `compatibility_id` are treated as running compatible firmware:
    /// the same supported fire modes, config schema, and selector semantics. The phone app
    /// keys profile catalogs by this value, not by BLE address, so replicas on different
    /// hardware can share profiles when the id matches.
    ///
    /// **When to reuse an id:** same product line and non-breaking fire-mode / config changes.
    ///
    /// **When to use a new id:** breaking changes to fire modes, config fields, or selector
    /// layout. Existing profiles stay under the old id; users start fresh under the new one.
    ///
    /// **Naming:** use a stable slug, preferably reverse-DNS (e.g. `catnip.shoebill-soe-hpa`).
    /// Keep the id constant across firmware releases for the same family.
    pub compatibility_id: String,
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

    /// Device metadata for hosts. Must return a stable [`Characteristics::compatibility_id`]
    /// for this firmware family so profiles can be shared across units.
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
