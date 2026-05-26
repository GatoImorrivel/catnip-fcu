use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Error)]
pub enum UpdateFireModeConfigError {
    #[error("Invalid Configuration provided")]
    InvalidConfig,
    #[error("Unsupported Fire mode provided")]
    UnsupportedFireMode
}