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

/// Reads a bank of GPIO inputs and encodes active pins as an integer (bit *i* = pin *i*).
pub struct FireSelector<'d> {
    pins: Vec<PinDriver<'d, AnyInputPin, Input>>,
    config: FireSelectorConfig,
}

impl<'d> FireSelector<'d> {
    pub fn new(
        pins: impl IntoIterator<Item = impl InputPin + 'd>,
        config: FireSelectorConfig,
    ) -> anyhow::Result<Self> {
        let mut drivers = Vec::new();
        for pin in pins {
            let any = pin.downgrade_input();
            drivers.push(PinDriver::input(any)?);
        }

        if drivers.len() != config.active_levels.len() {
            anyhow::bail!(
                "fire selector: {} pins but {} active-level entries",
                drivers.len(),
                config.active_levels.len()
            );
        }

        Ok(Self {
            pins: drivers,
            config,
        })
    }

    /// Current selector value: bit *i* is set when pin *i* is active per config.
    pub fn read(&self) -> u32 {
        let mut value = 0u32;
        for (i, pin) in self.pins.iter().enumerate() {
            if is_active(pin.get_level(), self.config.active_levels[i]) {
                value |= 1 << i;
            }
        }
        value
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
