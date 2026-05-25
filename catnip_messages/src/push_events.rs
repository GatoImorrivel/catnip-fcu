use catnip_core::FireMode;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FCUToHostEvent {
    FireModeChange(FireMode),
    TriggerPull
}