use serde::{Deserialize, Serialize};

use crate::FireMode;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FCUToHostEvent {
    FireModeChange(FireMode),
    TriggerPull
}