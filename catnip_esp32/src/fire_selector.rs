use catnip_core::FireSelectorPosition;
use esp_idf_svc::hal::gpio::{AnyIOPin, Input, IOPin, Level, PinDriver};

pub use esp_idf_svc::hal::gpio::Pull;

/// GPIO level that counts as "selected" for a fire-selector bit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveLevel {
    Low,
    High,
}

/// One fire-selector input and the GPIO level that counts as active.
pub struct FireSelectorPin<'d> {
    pin: PinDriver<'d, AnyIOPin, Input>,
    active_level: ActiveLevel,
}

impl<'d> FireSelectorPin<'d> {
    pub fn new(
        pin: impl IOPin + 'd,
        active_level: ActiveLevel,
        pull: Pull,
    ) -> anyhow::Result<Self> {
        let any = pin.downgrade();
        let mut driver = PinDriver::input(any)?;
        driver.set_pull(pull)?;

        Ok(Self {
            pin: driver,
            active_level,
        })
    }

    pub fn active_level(&self) -> ActiveLevel {
        self.active_level
    }

    fn is_active(&self) -> bool {
        is_active(self.pin.get_level(), self.active_level)
    }
}

/// Reads a bank of GPIO inputs and encodes active pins as an integer (bit *i* = pin *i*).
pub struct ESP32FireSelector<'d> {
    pins: Vec<FireSelectorPin<'d>>,
}

impl<'d> catnip_core::FireSelector for ESP32FireSelector<'d> {
    fn read(&self) -> FireSelectorPosition {
        let mut value = 0usize;
        for (i, pin) in self.pins.iter().enumerate() {
            if pin.is_active() {
                value |= 1 << i;
            }
        }
        value
    }

    fn position_count(&self) -> usize {
        self.pin_count().pow(2)
    }
}

impl<'d> ESP32FireSelector<'d> {
    pub fn new(pins: impl IntoIterator<Item = FireSelectorPin<'d>>) -> Self {
        Self {
            pins: pins.into_iter().collect(),
        }
    }

    pub fn pin_count(&self) -> usize {
        self.pins.len()
    }
}

fn is_active(level: Level, active: ActiveLevel) -> bool {
    matches!(
        (level, active),
        (Level::Low, ActiveLevel::Low) | (Level::High, ActiveLevel::High)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_active_matches_level() {
        assert!(is_active(Level::Low, ActiveLevel::Low));
        assert!(is_active(Level::High, ActiveLevel::High));
        assert!(!is_active(Level::High, ActiveLevel::Low));
        assert!(!is_active(Level::Low, ActiveLevel::High));
    }
}
