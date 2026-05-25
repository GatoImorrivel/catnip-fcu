use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum UpdateFireModeConfigError {
    InvalidConfig,
    UnsupportedFireMode
}