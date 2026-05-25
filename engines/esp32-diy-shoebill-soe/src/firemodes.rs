use catnip_esp32::{FireModeConfig, FireModeConfigField};
pub struct SemiAutoConfig {
    pub dwell_ms: i32,
    pub delay_ms: i32,
}

impl FireModeConfig for SemiAutoConfig {
    fn fields(&self) -> Vec<FireModeConfigField> {
        vec![]
    }
    fn update(&mut self, new: Self) -> anyhow::Result<()> {
        Ok(())
    }
}
