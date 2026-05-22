use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FireMode {
    Safe,
    FullAuto,
    SemiAuto,
    Burst,
}

pub struct Capabitilities {
    pub num_fire_positions: u8,
    pub num_solenoids: u8,
    pub supported_firemodes: [FireMode; 4],
}

pub type FireModeConfigMap = HashMap<FireMode, Vec<FireModeConfigField>>;
pub type FireModeConfigField = HashMap<&'static str, FireModeConfigType>;

pub enum FireModeConfigType {
    Numeric {
        min: i32,
        max: i32,
        current: i32,
        default: Option<i32>,
    },
    NonNegativeNumeric {
        min: u32,
        max: u32,
        current: u32,
        default: Option<u32>,
    }
}

pub enum UpdateFireModeFieldValue {
    Numeric(i32),
    NonNegativeNumeric(u32)
}

pub trait FireModeConfig {
    fn fields() -> Vec<FireModeConfigField>;
    fn update_field(field_name: &str, value: UpdateFireModeFieldValue) -> anyhow::Result<()>;
}

pub trait FCUConfig  {
    fn capabilities(&self) -> Capabitilities;
    fn get_current_firemode(&self) -> FireMode;
    fn set_firemode(&mut self, firemode: FireMode) -> anyhow::Result<()>;
    fn get_firemode_config(&self, firemode: FireMode) -> anyhow::Result<FireModeConfigMap>;
}