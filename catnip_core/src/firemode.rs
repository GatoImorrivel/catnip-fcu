use std::collections::HashMap;

use serde::{Serialize, de::DeserializeOwned};

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum FireModeConfigTypeUnit {
    Milliseconds,
    Seconds,
    Minutes,
    Number,
    Boolean,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct FireModeConfigType<T> {
    pub name: String,
    pub display_name: String,
    pub min: T,
    pub max: T,
    pub default: Option<T>,
    pub unit: FireModeConfigTypeUnit,
}

pub struct WithCurrentValue<T> {
    pub config_type: FireModeConfigType<T>,
    pub current_value: T,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum FireModeConfigField {
    Numeric(FireModeConfigType<i32>),
    Boolean(FireModeConfigType<bool>),
}

pub trait FireModeConfig:
    Clone
    + Serialize
    + DeserializeOwned
    + TryFrom<HashMap<String, String>, Error = anyhow::Error>
    + Into<HashMap<String, String>>
{
    fn shape() -> Vec<FireModeConfigField>;
}

pub fn required_i32(
    map: &HashMap<String, String>,
    key: &str,
    min: i32,
    max: i32,
) -> anyhow::Result<i32> {
    let raw = map
        .get(key)
        .ok_or_else(|| anyhow::anyhow!("missing config field: {key}"))?;
    let value: i32 = raw
        .parse()
        .map_err(|_| anyhow::anyhow!("invalid integer for {key}: {raw}"))?;
    if value < min || value > max {
        anyhow::bail!("{key} must be between {min} and {max}, got {value}");
    }
    Ok(value)
}

pub fn required_bool(map: &HashMap<String, String>, key: &str) -> anyhow::Result<bool> {
    let raw = map
        .get(key)
        .ok_or_else(|| anyhow::anyhow!("missing config field: {key}"))?;
    match raw.as_str() {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => anyhow::bail!("invalid boolean for {key}: {raw}"),
    }
}

pub fn insert_i32(map: &mut HashMap<String, String>, key: &str, value: i32) {
    map.insert(key.to_string(), value.to_string());
}

pub fn insert_bool(map: &mut HashMap<String, String>, key: &str, value: bool) {
    map.insert(key.to_string(), value.to_string());
}
