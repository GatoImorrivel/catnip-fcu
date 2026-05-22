use anyhow::Ok;
use catnip_esp32::{Capabitilities, ESP32FCU, FCUConfig, FireMode, fire_selector::FireSelector};
use esp_idf_svc::hal::gpio::AnyInputPin;

fn main() -> anyhow::Result<()> {
    esp_idf_svc::sys::link_patches();
    esp_idf_svc::log::EspLogger::initialize_default();

    Ok(())
}

pub struct ShoebillSOE {
    current_firemode: FireMode,
    solenoid_pin: AnyInputPin,
    fire_selector: FireSelector
}

impl FCUConfig for ShoebillSOE {
    fn capabilities(&self) -> Capabitilities {
        Capabitilities {
            num_fire_positions: 4,
            num_solenoids: 1,
            supported_firemodes: [FireMode::Burst, FireMode::FullAuto, FireMode::Safe, FireMode::SemiAuto]
        }
    }

    fn get_current_firemode(&self) -> FireMode {
        self.current_firemode
    }

    fn get_firemode_config(&self, firemode: FireMode) -> anyhow::Result<FireModeConfigMap> {
       match firemode {
           FireMode::Burst => {
                Ok(())
           },
           FireMode::Safe => {
                Ok(())
           } 
           FireMode::FullAuto => {
                Ok(())
           } 
           FireMode::SemiAuto => {
                Ok(())
           } 
       } 
    }

    fn set_firemode(&mut self, firemode: FireMode) -> anyhow::Result<()> {
        self.current_firemode = firemode;
        Ok(())
    }
}

impl ESP32FCU for ShoebillSOE {
    fn routine(&mut self) -> anyhow::Result<()> {
       Ok(()) 
    }
}