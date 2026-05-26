use std::sync::Mutex;

use esp_idf_svc::nvs::{EspDefaultNvs, EspDefaultNvsPartition};
use serde::de::DeserializeOwned;

use catnip_core::PositionAssignmentStorage;

const FIREMODE_CONFIG_NAMESPACE: &str = "firemode_cfg";
const MAX_BLOB_LEN: usize = 512;

pub struct ESP32PositionAssignmentStorage {
    nvs: Mutex<EspDefaultNvs>,
}

impl ESP32PositionAssignmentStorage {
    pub fn new(partition: EspDefaultNvsPartition) -> anyhow::Result<Self> {
        let nvs = EspDefaultNvs::new(partition, FIREMODE_CONFIG_NAMESPACE, true)
            .map_err(|e| anyhow::anyhow!("failed to open NVS namespace {FIREMODE_CONFIG_NAMESPACE}: {e}"))?;
        Ok(Self {
            nvs: Mutex::new(nvs),
        })
    }

    fn key_for_position(fire_selector_position: usize) -> anyhow::Result<String> {
        let key = format!("p{fire_selector_position}");
        if key.len() > 15 {
            anyhow::bail!("fire selector position {fire_selector_position} exceeds NVS key limit");
        }
        Ok(key)
    }
}

impl PositionAssignmentStorage for ESP32PositionAssignmentStorage {
    fn save_assignment(
        &self,
        position: usize,
        assignment: &impl serde::Serialize,
    ) -> anyhow::Result<()> {
        let bytes = postcard::to_allocvec(assignment)?;
        if bytes.len() > MAX_BLOB_LEN {
            anyhow::bail!(
                "fire mode assignment too large for NVS ({} bytes, max {MAX_BLOB_LEN})",
                bytes.len()
            );
        }

        let key = Self::key_for_position(position)?;
        let mut nvs = self.nvs.lock().unwrap();
        nvs.set_raw(&key, &bytes)
            .map_err(|e| anyhow::anyhow!("failed to write NVS key {key}: {e}"))?;
        Ok(())
    }

    fn load_assignment<M: DeserializeOwned>(&self, position: usize) -> anyhow::Result<Option<M>> {
        let key = Self::key_for_position(position)?;
        let mut buf = vec![0u8; MAX_BLOB_LEN];
        let nvs = self.nvs.lock().unwrap();
        let blob = nvs
            .get_raw(&key, &mut buf)
            .map_err(|e| anyhow::anyhow!("failed to read NVS key {key}: {e}"))?;

        let Some(bytes) = blob else {
            return Ok(None);
        };
        Ok(Some(postcard::from_bytes(bytes)?))
    }
}
