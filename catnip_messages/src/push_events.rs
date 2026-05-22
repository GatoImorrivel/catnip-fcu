use catnip_core::FireMode;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub enum FCUToHostEvent {
    FireModeChange(FireMode),
    TriggerPull
}