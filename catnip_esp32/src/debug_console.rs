use catnip_core::firemode::FireMode;
use catnip_core::FCU;

#[cfg(debug_assertions)]
pub struct DebugConsole {
    line: String,
}

#[cfg(debug_assertions)]
impl Default for DebugConsole {
    fn default() -> Self {
        Self {
            line: String::new(),
        }
    }
}

#[cfg(debug_assertions)]
impl DebugConsole {
    pub fn poll<F: FCU>(&mut self, fcu: &mut F) {
        use std::io::Read;

        let mut byte = [0u8; 1];
        loop {
            match std::io::stdin().read(&mut byte) {
                Ok(0) => break,
                Ok(_) => {
                    if byte[0] == b'\r' || byte[0] == b'\n' {
                        let line = std::mem::take(&mut self.line);
                        self.handle_line(fcu, line.trim());
                    } else {
                        self.line.push(byte[0] as char);
                    }
                }
                Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => break,
                Err(err) => {
                    log::error!(target: "catnip_debug", "stdin read: {err}");
                    break;
                }
            }
        }
    }

    fn handle_line<F: FCU>(&self, fcu: &mut F, line: &str) {
        if line.is_empty() {
            return;
        }

        match line {
            "firemode" | "/firemode" => Self::log_firemode(fcu),
            _ => log::info!(
                target: "catnip_debug",
                "unknown command '{line}'; try: firemode"
            ),
        }
    }

    fn log_firemode<F: FCU>(fcu: &mut F) {
        match fcu.poll_selector_position() {
            Ok(position) => {
                let mode = fcu.assignment_for_position(position);
                log::info!(
                    target: "catnip_debug",
                    "selector_position={position} fire_mode={} config={:?}",
                    mode.wire_name(),
                    mode.values(),
                );
            }
            Err(err) => {
                log::error!(target: "catnip_debug", "poll_selector_position: {err}");
            }
        }
    }
}

#[cfg(not(debug_assertions))]
pub struct DebugConsole;

#[cfg(not(debug_assertions))]
impl Default for DebugConsole {
    fn default() -> Self {
        Self
    }
}

#[cfg(not(debug_assertions))]
impl DebugConsole {
    pub fn poll<F: FCU>(&mut self, _fcu: &mut F) {}
}
