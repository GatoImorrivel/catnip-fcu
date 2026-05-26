use std::cell::RefCell;
use std::sync::Mutex;

use catnip_core::{firemode::FireModeConfig, FireModeConfigStorage};
use esp_idf_svc::nvs::{EspDefaultNvs, EspDefaultNvsPartition};

const FIREMODE_CONFIG_NAMESPACE: &str = "firemode_cfg";
const MAX_BLOB_LEN: usize = 512;

pub struct ESP32FireModeConfigStorage {
    nvs: Mutex<EspDefaultNvs>,
    /// Last position passed to [`FireModeConfigStorage::load_firemode_config`], used by save.
    last_position: RefCell<Option<usize>>,
    /// Raw bytes from the last load.
    loaded: RefCell<Option<Vec<u8>>>,
}

impl ESP32FireModeConfigStorage {
    pub fn new(partition: EspDefaultNvsPartition) -> anyhow::Result<Self> {
        let nvs = EspDefaultNvs::new(partition, FIREMODE_CONFIG_NAMESPACE, true)
            .map_err(|e| anyhow::anyhow!("failed to open NVS namespace {FIREMODE_CONFIG_NAMESPACE}: {e}"))?;
        Ok(Self {
            nvs: Mutex::new(nvs),
            last_position: RefCell::new(None),
            loaded: RefCell::new(None),
        })
    }

    /// Deserialize config bytes from the last [`load_firemode_config`](FireModeConfigStorage::load_firemode_config).
    pub fn loaded_config<C: FireModeConfig>(&self) -> anyhow::Result<Option<C>> {
        let bytes = self.loaded.borrow().clone();
        let Some(bytes) = bytes else {
            return Ok(None);
        };
        Ok(Some(postcard::from_bytes(&bytes)?))
    }

    fn key_for_position(fire_selector_position: usize) -> anyhow::Result<String> {
        let key = format!("p{fire_selector_position}");
        if key.len() > 15 {
            anyhow::bail!("fire selector position {fire_selector_position} exceeds NVS key limit");
        }
        Ok(key)
    }
}

impl FireModeConfigStorage for ESP32FireModeConfigStorage {
    fn save_firemode_config(&self, config: &impl FireModeConfig) -> anyhow::Result<()> {
        let position = self
            .last_position
            .borrow()
            .ok_or_else(|| anyhow::anyhow!("load_firemode_config must be called before save_firemode_config"))?;

        let bytes = postcard::to_allocvec(config)?;
        if bytes.len() > MAX_BLOB_LEN {
            anyhow::bail!(
                "fire mode config too large for NVS ({} bytes, max {MAX_BLOB_LEN})",
                bytes.len()
            );
        }

        let key = Self::key_for_position(position)?;
        let mut nvs = self.nvs.lock().unwrap();
        nvs.set_raw(&key, &bytes)
            .map_err(|e| anyhow::anyhow!("failed to write NVS key {key}: {e}"))?;
        Ok(())
    }

    fn load_firemode_config(&self, fire_selector_position: usize) -> anyhow::Result<()> {
        *self.last_position.borrow_mut() = Some(fire_selector_position);

        let key = Self::key_for_position(fire_selector_position)?;
        let mut buf = vec![0u8; MAX_BLOB_LEN];
        let nvs = self.nvs.lock().unwrap();
        let blob = nvs
            .get_raw(&key, &mut buf)
            .map_err(|e| anyhow::anyhow!("failed to read NVS key {key}: {e}"))?;

        *self.loaded.borrow_mut() = blob.map(|b| b.to_vec());
        Ok(())
    }
}
