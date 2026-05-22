use catnip_esp32::{
    Characteristics, ESP32FCU, FCUConfig, FCUKind, FireMode, FireModeConfigFields, FireSelector,
    fire_selector::{ActiveLevel, ESP32FireSelector, FireSelectorPin, Pull},
    server::ESP32FCUServer,
};
use esp_idf_svc::hal::{gpio::{AnyInputPin, AnyOutputPin, InputPin, OutputPin}, peripherals::Peripherals};
use esp_idf_svc::nvs::EspDefaultNvsPartition;

fn main() -> anyhow::Result<()> {
    esp_idf_svc::sys::link_patches();
    esp_idf_svc::log::EspLogger::initialize_default();

    let peripherals = Peripherals::take()?;
    let nvs = EspDefaultNvsPartition::take()?;

    let fcu = ShoebillSOE {
        current_firemode: FireMode::Safe,
        solenoid_pin: peripherals.pins.gpio25.downgrade_output(),
        trigger_pin: peripherals.pins.gpio32.downgrade_input(),
        fire_selector: ESP32FireSelector::new([
            FireSelectorPin::new(peripherals.pins.gpio16, ActiveLevel::Low, Pull::Up)?,
            FireSelectorPin::new(peripherals.pins.gpio17, ActiveLevel::Low, Pull::Up)?,
        ]),
    };

    let modem = peripherals.modem;
    let server = ESP32FCUServer::new(fcu, modem, nvs)?;

    server.run();

    Ok(())
}

pub struct ShoebillSOE<'a> {
    current_firemode: FireMode,
    solenoid_pin: AnyOutputPin,
    trigger_pin: AnyInputPin,
    fire_selector: catnip_esp32::fire_selector::ESP32FireSelector<'a>,
}

impl FCUConfig for ShoebillSOE<'_> {
    fn characteristics(&self) -> Characteristics {
        Characteristics {
            num_fire_positions: self.fire_selector.position_count() as u8,
            supported_firemodes: [
                FireMode::Burst,
                FireMode::FullAuto,
                FireMode::Safe,
                FireMode::SemiAuto,
            ],
            name: "Shoebill diy".into(),
            kind: FCUKind::HPA { num_solenoids: 1 },
        }
    }

    fn get_current_firemode(&self) -> FireMode {
        self.current_firemode
    }

    fn get_firemode_config(&self, _firemode: FireMode) -> Option<FireModeConfigFields> {
        None
    }

    fn set_firemode(&mut self, firemode: FireMode) -> anyhow::Result<()> {
        self.current_firemode = firemode;
        Ok(())
    }
}

impl ESP32FCU for ShoebillSOE<'_> {
    fn routine(&mut self) -> anyhow::Result<()> {
        Ok(())
    }
}
