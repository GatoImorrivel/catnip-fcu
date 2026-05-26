use std::collections::HashMap;

use catnip_esp32::{
    firemode::insert_bool, firemode::insert_i32, firemode::required_bool, firemode::required_i32,
    firemode::FireModeConfig, firemode::FireModeConfigField, firemode::FireModeConfigType,
    firemode::FireModeConfigTypeUnit,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum FireModes {
    Safe,
    FullAuto,
    SemiAuto,
    Burst,
}

impl Into<String> for FireModes {
    fn into(self) -> String {
        match self {
            FireModes::Safe => "Safe".to_string(),
            FireModes::FullAuto => "FullAuto".to_string(),
            FireModes::SemiAuto => "SemiAuto".to_string(),
            FireModes::Burst => "Burst".to_string(),
        }
    }
}

impl TryFrom<String> for FireModes {
    type Error = anyhow::Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.as_str() {
            "Safe" => Ok(FireModes::Safe),
            "FullAuto" => Ok(FireModes::FullAuto),
            "SemiAuto" => Ok(FireModes::SemiAuto),
            "Burst" => Ok(FireModes::Burst),
            _ => anyhow::bail!("unsupported firemode: {value}"),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum FireModesConfigs {
    Safe,
    FullAuto(FullAutoConfig),
    SemiAuto(SemiAutoConfig),
    Burst(BurstConfig),
}

impl TryFrom<(FireModes, HashMap<String, String>)> for FireModesConfigs {
    type Error = anyhow::Error;

    fn try_from(value: (FireModes, HashMap<String, String>)) -> Result<Self, Self::Error> {
        let (firemode, map) = value;
        match firemode {
            FireModes::Safe => Ok(FireModesConfigs::Safe),
            FireModes::FullAuto => Ok(FireModesConfigs::FullAuto(map.try_into()?)),
            FireModes::SemiAuto => Ok(FireModesConfigs::SemiAuto(map.try_into()?)),
            FireModes::Burst => Ok(FireModesConfigs::Burst(map.try_into()?)),
        }
    }
}

impl Into<HashMap<String, String>> for FireModesConfigs {
    fn into(self) -> HashMap<String, String> {
        match self {
            FireModesConfigs::Safe => HashMap::new(),
            FireModesConfigs::FullAuto(config) => config.into(),
            FireModesConfigs::SemiAuto(config) => config.into(),
            FireModesConfigs::Burst(config) => config.into(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct SemiAutoConfig {
    pub dwell_ms: i32,
    pub delay_ms: i32,
}

impl FireModeConfig for SemiAutoConfig {
    fn shape() -> Vec<FireModeConfigField> {
        vec![
            FireModeConfigField::Numeric(FireModeConfigType {
                name: "dwell_ms".to_string(),
                display_name: "Dwell Time".to_string(),
                min: 1,
                max: 1000,
                default: Some(10),
                unit: FireModeConfigTypeUnit::Milliseconds,
            }),
            FireModeConfigField::Numeric(FireModeConfigType {
                name: "delay_ms".to_string(),
                display_name: "Delay Time".to_string(),
                min: 1,
                max: 1000,
                default: Some(10),
                unit: FireModeConfigTypeUnit::Milliseconds,
            }),
        ]
    }
}

impl TryFrom<HashMap<String, String>> for SemiAutoConfig {
    type Error = anyhow::Error;

    fn try_from(map: HashMap<String, String>) -> Result<Self, Self::Error> {
        Ok(Self {
            dwell_ms: required_i32(&map, "dwell_ms", 1, 1000)?,
            delay_ms: required_i32(&map, "delay_ms", 1, 1000)?,
        })
    }
}

impl From<SemiAutoConfig> for HashMap<String, String> {
    fn from(config: SemiAutoConfig) -> Self {
        let mut map = HashMap::new();
        insert_i32(&mut map, "dwell_ms", config.dwell_ms);
        insert_i32(&mut map, "delay_ms", config.delay_ms);
        map
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct FullAutoConfig {
    pub dwell_ms: i32,
    pub delay_ms: i32,
}

impl FireModeConfig for FullAutoConfig {
    fn shape() -> Vec<FireModeConfigField> {
        vec![
            FireModeConfigField::Numeric(FireModeConfigType {
                name: "dwell_ms".to_string(),
                display_name: "Dwell Time".to_string(),
                min: 1,
                max: 1000,
                default: Some(10),
                unit: FireModeConfigTypeUnit::Milliseconds,
            }),
            FireModeConfigField::Numeric(FireModeConfigType {
                name: "delay_ms".to_string(),
                display_name: "Delay Time".to_string(),
                min: 1,
                max: 1000,
                default: Some(10),
                unit: FireModeConfigTypeUnit::Milliseconds,
            }),
        ]
    }
}

impl TryFrom<HashMap<String, String>> for FullAutoConfig {
    type Error = anyhow::Error;

    fn try_from(map: HashMap<String, String>) -> Result<Self, Self::Error> {
        Ok(Self {
            dwell_ms: required_i32(&map, "dwell_ms", 1, 1000)?,
            delay_ms: required_i32(&map, "delay_ms", 1, 1000)?,
        })
    }
}

impl From<FullAutoConfig> for HashMap<String, String> {
    fn from(config: FullAutoConfig) -> Self {
        let mut map = HashMap::new();
        insert_i32(&mut map, "dwell_ms", config.dwell_ms);
        insert_i32(&mut map, "delay_ms", config.delay_ms);
        map
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BurstConfig {
    pub dwell_ms: i32,
    pub next_burst_delay: i32,
    pub burst_count: i32,
    pub next_shot_delay: i32,
    pub continuous: bool,
}

impl FireModeConfig for BurstConfig {
    fn shape() -> Vec<FireModeConfigField> {
        vec![
            FireModeConfigField::Numeric(FireModeConfigType {
                name: "dwell_ms".to_string(),
                display_name: "Dwell Time".to_string(),
                min: 1,
                max: 1000,
                default: Some(10),
                unit: FireModeConfigTypeUnit::Milliseconds,
            }),
            FireModeConfigField::Numeric(FireModeConfigType {
                name: "next_burst_delay".to_string(),
                display_name: "Next Burst Delay".to_string(),
                min: 1,
                max: 1000,
                default: Some(10),
                unit: FireModeConfigTypeUnit::Milliseconds,
            }),
            FireModeConfigField::Numeric(FireModeConfigType {
                name: "burst_count".to_string(),
                display_name: "Burst Count".to_string(),
                min: 1,
                max: 100,
                default: Some(3),
                unit: FireModeConfigTypeUnit::Number,
            }),
            FireModeConfigField::Numeric(FireModeConfigType {
                name: "next_shot_delay".to_string(),
                display_name: "Next Shot Delay".to_string(),
                min: 1,
                max: 1000,
                default: Some(10),
                unit: FireModeConfigTypeUnit::Milliseconds,
            }),
            FireModeConfigField::Boolean(FireModeConfigType {
                name: "continuous".to_string(),
                display_name: "Continuous Burst".to_string(),
                min: false,
                max: true,
                default: Some(false),
                unit: FireModeConfigTypeUnit::Boolean,
            }),
        ]
    }
}

impl TryFrom<HashMap<String, String>> for BurstConfig {
    type Error = anyhow::Error;

    fn try_from(map: HashMap<String, String>) -> Result<Self, Self::Error> {
        Ok(Self {
            dwell_ms: required_i32(&map, "dwell_ms", 1, 1000)?,
            next_burst_delay: required_i32(&map, "next_burst_delay", 1, 1000)?,
            burst_count: required_i32(&map, "burst_count", 1, 100)?,
            next_shot_delay: required_i32(&map, "next_shot_delay", 1, 1000)?,
            continuous: required_bool(&map, "continuous")?,
        })
    }
}

impl From<BurstConfig> for HashMap<String, String> {
    fn from(config: BurstConfig) -> Self {
        let mut map = HashMap::new();
        insert_i32(&mut map, "dwell_ms", config.dwell_ms);
        insert_i32(&mut map, "next_burst_delay", config.next_burst_delay);
        insert_i32(&mut map, "burst_count", config.burst_count);
        insert_i32(&mut map, "next_shot_delay", config.next_shot_delay);
        insert_bool(&mut map, "continuous", config.continuous);
        map
    }
}
