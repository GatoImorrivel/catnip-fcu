use esp_idf_svc::hal::gpio::{AnyInputPin, Input, InputPin, Level, PinDriver};

/// GPIO level that counts as "selected" for a fire-selector bit.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveLevel {
    Low,
    High,
}

/// Per-pin active levels. Must match the pin count passed to [`FireSelector::new`].
#[derive(Debug, Clone)]
pub struct FireSelectorConfig {
    active_levels: Vec<ActiveLevel>,
}

impl FireSelectorConfig {
    pub fn new(active_levels: impl Into<Vec<ActiveLevel>>) -> Self {
        Self {
            active_levels: active_levels.into(),
        }
    }

    /// Same active level for every pin.
    pub fn uniform(active_level: ActiveLevel, pin_count: usize) -> Self {
        Self {
            active_levels: vec![active_level; pin_count],
        }
    }

    pub fn active_levels(&self) -> &[ActiveLevel] {
        &self.active_levels
    }
}

/// One fire-selector input and the GPIO level that counts as active.
pub struct FireSelectorPin<'d> {
    pin: PinDriver<'d, AnyInputPin, Input>,
    active_level: ActiveLevel,
}

impl<'d> FireSelectorPin<'d> {
    pub fn new(pin: impl InputPin + 'd, active_level: ActiveLevel) -> anyhow::Result<Self> {
        let any = pin.downgrade_input();
        Ok(Self {
            pin: PinDriver::input(any)?,
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
pub struct FireSelector<'d> {
    pins: Vec<FireSelectorPin<'d>>,
}

impl<'d> catnip_core::FireSelector for FireSelector<'d> {
    fn read(&self) -> u32 {
        let mut value = 0u32;
        for (i, pin) in self.pins.iter().enumerate() {
            if pin.is_active() {
                value |= 1 << i;
            }
        }
        value
    }
}

impl<'d> FireSelector<'d> {
    pub fn new(
        pins: impl IntoIterator<Item = impl InputPin + 'd>,
        config: FireSelectorConfig,
    ) -> anyhow::Result<Self> {
        let active_levels = config.active_levels;
        let mut selector_pins = Vec::new();

        for (i, pin) in pins.into_iter().enumerate() {
            let active_level = active_levels.get(i).copied().ok_or_else(|| {
                anyhow::anyhow!("fire selector: {} pins but {} active-level entries", i + 1, active_levels.len())
            })?;
            selector_pins.push(FireSelectorPin::new(pin, active_level)?);
        }

        if selector_pins.len() != active_levels.len() {
            anyhow::bail!(
                "fire selector: {} pins but {} active-level entries",
                selector_pins.len(),
                active_levels.len()
            );
        }

        Ok(Self {
            pins: selector_pins,
        })
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
