use std::collections::HashMap;
use std::time::{Duration, Instant};

use catnip_esp32::{
    fire_selector::{ActiveLevel, ESP32FireSelector, FireSelectorPin, Pull},
    firemode::FireModePositionTable,
    server::ESP32FCUServer,
    Characteristics, ESP32PositionAssignmentStorage, FCUKind, FireResult, FireSelector, FCU,
};
use esp_idf_svc::hal::gpio::Level;
use esp_idf_svc::hal::{
    gpio::{AnyInputPin, AnyOutputPin, Input, InputPin, Output, OutputPin, PinDriver},
    peripherals::Peripherals,
};
use esp_idf_svc::nvs::EspDefaultNvsPartition;

use crate::firemodes::{BurstConfig, FireMode, FullAutoConfig, SemiAutoConfig};

mod firemodes;

fn main() -> anyhow::Result<()> {
    esp_idf_svc::sys::link_patches();
    esp_idf_svc::log::EspLogger::initialize_default();

    let peripherals = Peripherals::take()?;
    let nvs = EspDefaultNvsPartition::take()?;
    let storage = ESP32PositionAssignmentStorage::new(nvs.clone())?;

    let mut defaults = HashMap::new();
    defaults.insert(0, FireMode::Safe);
    defaults.insert(1, FireMode::SemiAuto(SemiAutoConfig::default()));
    defaults.insert(2, FireMode::FullAuto(FullAutoConfig::default()));
    defaults.insert(3, FireMode::Burst(BurstConfig::default()));

    let mut fire_modes = FireModePositionTable::new(defaults);
    let num_positions = 4;
    fire_modes.load_from_storage(&storage, num_positions)?;

    let fcu = ShoebillSOE {
        solenoid_pin: PinDriver::output(peripherals.pins.gpio25.downgrade_output())?,
        trigger_pin: PinDriver::input(peripherals.pins.gpio32.downgrade_input())?,
        fire_selector: ESP32FireSelector::new([
            FireSelectorPin::new(peripherals.pins.gpio16, ActiveLevel::Low, Pull::Up)?,
            FireSelectorPin::new(peripherals.pins.gpio17, ActiveLevel::Low, Pull::Up)?,
        ]),
        fire_modes,
        semi_waiting_release: false,
    };

    let modem = peripherals.modem;
    let server = ESP32FCUServer::new(fcu, modem, nvs, storage)?;

    server.run();

    Ok(())
}

pub struct ShoebillSOE<'d> {
    solenoid_pin: PinDriver<'d, AnyOutputPin, Output>,
    trigger_pin: PinDriver<'d, AnyInputPin, Input>,
    fire_selector: ESP32FireSelector<'d>,
    fire_modes: FireModePositionTable<FireMode>,
    semi_waiting_release: bool,
}

impl ShoebillSOE<'_> {
    fn trigger_pulled(&mut self) -> anyhow::Result<bool> {
        Ok(self.trigger_pin.get_level() == Level::Low)
    }

    fn pulse_solenoid(&mut self, dwell_ms: i32) -> anyhow::Result<()> {
        self.solenoid_pin
            .set_level(Level::High)
            .map_err(|e| anyhow::anyhow!("{e:?}"))?;
        std::thread::sleep(Duration::from_millis(dwell_ms.clamp(1, 1000) as u64));
        self.solenoid_pin
            .set_level(Level::Low)
            .map_err(|e| anyhow::anyhow!("{e:?}"))?;
        Ok(())
    }

    fn delay_elapsed(last_shot: Instant, now: Instant, delay_ms: i32) -> bool {
        now.duration_since(last_shot) >= Duration::from_millis(delay_ms.clamp(1, 10_000) as u64)
    }
}

impl FCU for ShoebillSOE<'_> {
    type FireMode = FireMode;

    fn characteristics(&self) -> Characteristics {
        Characteristics {
            num_fire_positions: self.fire_selector.position_count() as u8,
            name: "Shoebill SOE ESP32".into(),
            kind: FCUKind::HPA { num_solenoids: 1 },
        }
    }

    fn poll_selector_position(&mut self) -> anyhow::Result<usize> {
        Ok(self.fire_selector.read())
    }

    fn fire_cycle(
        &mut self,
        mode: Self::FireMode,
        last_shot_instant: Instant,
        now: Instant,
    ) -> anyhow::Result<FireResult> {
        let trigger = self.trigger_pulled()?;

        match mode {
            FireMode::Safe => Ok(FireResult::Skipped),
            FireMode::SemiAuto(cfg) => {
                if !trigger {
                    self.semi_waiting_release = false;
                    return Ok(FireResult::Skipped);
                }
                if self.semi_waiting_release {
                    return Ok(FireResult::Skipped);
                }
                if !Self::delay_elapsed(last_shot_instant, now, cfg.delay_ms) {
                    return Ok(FireResult::Skipped);
                }
                self.pulse_solenoid(cfg.dwell_ms)?;
                self.semi_waiting_release = true;
                Ok(FireResult::Shot)
            }
            FireMode::FullAuto(cfg) => {
                if !trigger {
                    return Ok(FireResult::Skipped);
                }
                if !Self::delay_elapsed(last_shot_instant, now, cfg.delay_ms) {
                    return Ok(FireResult::Skipped);
                }
                self.pulse_solenoid(cfg.dwell_ms)?;
                Ok(FireResult::Shot)
            }
            FireMode::Burst(cfg) => {
                if !trigger {
                    return Ok(FireResult::Skipped);
                }
                if !Self::delay_elapsed(last_shot_instant, now, cfg.next_shot_delay) {
                    return Ok(FireResult::Skipped);
                }
                self.pulse_solenoid(cfg.dwell_ms)?;
                Ok(FireResult::Shot)
            }
        }
    }

    fn assignment_for_position(
        &self,
        selector_position: catnip_esp32::FireSelectorPosition,
    ) -> Self::FireMode {
        self.fire_modes.get(selector_position)
    }

    fn set_assignment(
        &mut self,
        selector_position: catnip_esp32::FireSelectorPosition,
        mode: Self::FireMode,
    ) -> anyhow::Result<()> {
        self.fire_modes.set(selector_position, mode);
        Ok(())
    }

    fn supported_modes(&self) -> Vec<Self::FireMode> {
        self.fire_modes.supported()
    }
}
