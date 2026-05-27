#[macro_use]
mod macros;

pub mod table;

use std::collections::HashMap;

use serde::{de::DeserializeOwned, Deserialize, Serialize};

pub use catnip_firemode_derive::FireModeConfig;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FireModeConfigTypeUnit {
    Milliseconds,
    Seconds,
    Minutes,
    Number,
    Boolean,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FireModeConfigSchema {
    pub display_name: String,
    pub min: i32,
    pub max: i32,
    pub default: i32,
    pub unit: FireModeConfigTypeUnit,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FireModeConfigSchemaBool {
    pub display_name: String,
    pub default: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FireModeConfigSchemaEntry {
    Numeric(FireModeConfigSchema),
    Boolean(FireModeConfigSchemaBool),
}

pub type FireModeConfigFields = Vec<HashMap<String, FireModeConfigSchemaEntry>>;

pub trait FireModeConfig:
    Clone
    + Serialize
    + DeserializeOwned
    + TryFrom<HashMap<String, String>, Error = anyhow::Error>
    + Into<HashMap<String, String>>
{
    fn shape() -> FireModeConfigFields;
}

/// Unified per-engine fire mode assignment (variant + optional config payload).
pub trait FireMode: Clone + Serialize + DeserializeOwned {
    fn wire_name(&self) -> &'static str;
    fn schema(&self) -> FireModeConfigFields;
    fn values(&self) -> HashMap<String, String>;
    fn from_wire(name: &str, values: HashMap<String, String>) -> anyhow::Result<Self>
    where
        Self: Sized;
    fn supported() -> Vec<Self>
    where
        Self: Sized;
    fn from_name_for_schema(name: &str) -> anyhow::Result<Self>
    where
        Self: Sized;
}

pub trait PersistableFireModeAssignment: FireMode {
    fn save_assignment(
        &self,
        storage: &impl crate::PositionAssignmentStorage,
        position: usize,
    ) -> anyhow::Result<()>;
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

pub use table::FireModePositionTable;
