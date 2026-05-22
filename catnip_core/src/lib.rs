use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum FireMode {
    Safe,
    FullAuto,
    SemiAuto,
    Burst,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Characteristics {
    pub num_fire_positions: u8,
    pub supported_firemodes: [FireMode; 4],
    pub name: String,
    pub kind: FCUKind
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum FCUKind {
    HPA {
        num_solenoids: u8,
    },
    AEG
}

pub type FireModeConfigMap = HashMap<FireMode, Vec<FireModeConfigField>>;
pub type FireModeConfigField = HashMap<String, FireModeConfigType>;
pub type FireModeConfigFields = Vec<FireModeConfigField>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum FireModeConfigTypeUnit {
    Milliseconds,
    Seconds,
    Minutes,
    Number
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum FireModeConfigType {
    Numeric {
        min: i32,
        max: i32,
        current: i32,
        default: Option<i32>,
        unit: FireModeConfigTypeUnit
    }
}

pub enum UpdateFireModeFieldValue {
    Numeric(i32),
}

pub trait FireModeConfig {
    fn fields() -> Vec<FireModeConfigField>;
    fn update_field(field_name: &str, value: UpdateFireModeFieldValue) -> anyhow::Result<()>;
}

pub trait FCUConfig  {
    fn characteristics(&self) -> Characteristics;
    fn get_current_firemode(&self) -> FireMode;
    fn set_firemode(&mut self, firemode: FireMode) -> anyhow::Result<()>;
    fn get_firemode_config(&self, firemode: FireMode) -> Option<FireModeConfigMap>;
}

pub trait FireSelector {
    /// Current selector value: bit *i* is set when position *i* is active.
    fn read(&self) -> u32;
    fn position_count(&self) -> usize;
}