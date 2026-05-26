use std::collections::HashMap;

use catnip_esp32::{
    fire_selector::{ActiveLevel, ESP32FireSelector, FireSelectorPin, Pull},
    firemode::FireModeConfig,
    server::ESP32FCUServer,
    Characteristics, FCUKind, FireSelector, FCU,
};
use esp_idf_svc::hal::{
    gpio::{AnyInputPin, AnyOutputPin, InputPin, OutputPin},
    peripherals::Peripherals,
};
use esp_idf_svc::nvs::EspDefaultNvsPartition;

use crate::firemodes::{BurstConfig, FireModes, FireModesConfigs, FullAutoConfig, SemiAutoConfig};

mod firemodes;

fn main() -> anyhow::Result<()> {
    esp_idf_svc::sys::link_patches();
    esp_idf_svc::log::EspLogger::initialize_default();

    let peripherals = Peripherals::take()?;
    let nvs = EspDefaultNvsPartition::take()?;

    let fcu = ShoebillSOE {
        solenoid_pin: peripherals.pins.gpio25.downgrade_output(),
        trigger_pin: peripherals.pins.gpio32.downgrade_input(),
        fire_selector: ESP32FireSelector::new([
            FireSelectorPin::new(peripherals.pins.gpio16, ActiveLevel::Low, Pull::Up)?,
            FireSelectorPin::new(peripherals.pins.gpio17, ActiveLevel::Low, Pull::Up)?,
        ]),
        positions: HashMap::new(),
    };

    let modem = peripherals.modem;
    let server = ESP32FCUServer::new(fcu, modem, nvs)?;

    server.run();

    Ok(())
}

pub struct ShoebillSOE<'a> {
    solenoid_pin: AnyOutputPin,
    trigger_pin: AnyInputPin,
    fire_selector: catnip_esp32::fire_selector::ESP32FireSelector<'a>,
    positions: HashMap<usize, (FireModes, FireModesConfigs)>,
}

impl FCU for ShoebillSOE<'_> {
    type FireModes = FireModes;
    type FireModesConfigs = FireModesConfigs;

    fn characteristics(&self) -> Characteristics {
        Characteristics {
            num_fire_positions: self.fire_selector.position_count() as u8,
            name: "Shoebill SOE ESP32".into(),
            kind: FCUKind::HPA { num_solenoids: 1 },
        }
    }

    fn poll_selector_position(&mut self) -> anyhow::Result<usize> {
        let pos = self.fire_selector.read();
        Ok(pos as usize)
    }

    fn fire_cycle(
        &mut self,
        firemode: Self::FireModes,
        config: Self::FireModesConfigs,
        last_shot_instant: std::time::Instant,
        now: std::time::Instant,
    ) -> anyhow::Result<catnip_esp32::FireResult>
    {
        todo!()
    }

    fn get_firemode_fields(&self, firemode: Self::FireModes) -> Vec<catnip_esp32::firemode::FireModeConfigField> {
        todo!()
    }

    fn get_firemode_for_position(
        &self,
        selector_position: catnip_esp32::FireSelectorPosition,
    ) -> (Self::FireModes, Self::FireModesConfigs)
    {
        todo!()
    }

    fn get_supported_firemodes(&self) -> Vec<Self::FireModes> {
        todo!()
    }

    fn update_firemode_for_position(
        &mut self,
        selector_position: catnip_esp32::FireSelectorPosition,
        firemode: Self::FireModes,
        config: Self::FireModesConfigs,
    ) -> anyhow::Result<()>
    {
        todo!()
    }
}
