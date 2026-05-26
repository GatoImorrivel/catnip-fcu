use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FCUToHostEvent {
    SelectorPositionChange(usize),
    FireModeChange(String),
    TriggerPull,
}