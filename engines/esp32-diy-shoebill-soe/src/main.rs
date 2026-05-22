use catnip_esp32::{
    Capabitilities, ESP32FCU, FCUConfig, FireMode, FireModeConfigMap, fire_selector::{FireSelector, FireSelectorPin}, server::ESP32FCUServer
};
use esp_idf_svc::hal::{gpio::{AnyInputPin, InputPin}, peripherals::Peripherals};

fn main() -> anyhow::Result<()> {
    esp_idf_svc::sys::link_patches();
    esp_idf_svc::log::EspLogger::initialize_default();

    let peripherals = Peripherals::take()?;

    let fcu = ShoebillSOE {
        current_firemode: FireMode::Safe,
        solenoid_pin: peripherals.pins.gpio2.downgrade_input(),
        fire_selector: FireSelector::new([
            FireSelectorPin::new(peripherals.pins.gpio0, catnip_esp32::fire_selector::ActiveLevel::Low)?,
            FireSelectorPin::new(peripherals.pins.gpio1, catnip_esp32::fire_selector::ActiveLevel::Low)?
        ])
    };

    let server: ESP32FCUServer<ShoebillSOE> = ESP32FCUServer::new(fcu);

    server.run();

    Ok(())
}

pub struct ShoebillSOE<'a> {
    current_firemode: FireMode,
    solenoid_pin: AnyInputPin,
    fire_selector: catnip_esp32::fire_selector::FireSelector<'a>,
}

impl FCUConfig for ShoebillSOE<'_> {
    fn capabilities(&self) -> Capabitilities {
        Capabitilities {
            num_fire_positions: 4,
            num_solenoids: 1,
            supported_firemodes: [
                FireMode::Burst,
                FireMode::FullAuto,
                FireMode::Safe,
                FireMode::SemiAuto,
            ],
        }
    }

    fn get_current_firemode(&self) -> FireMode {
        self.current_firemode
    }

    fn get_firemode_config(&self, _firemode: FireMode) -> Option<FireModeConfigMap> {
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
