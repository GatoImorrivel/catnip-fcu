use std::sync::mpsc::Sender;

use catnip_core::{Capabitilities, FireMode, FireModeConfigMap};

#[derive(Debug, Clone)]
pub enum FCUToHostMessage {
    FireModeChange(FireMode),
    UnsupportedFiremode(Option<FireMode>)
}

#[derive(Debug, Clone)]
pub enum HostToFCUMessage {
    GetCapabilities {
        reply: Sender<Capabitilities>
    },
    GetFireModeConfig {
        target_firemode: FireMode,
        reply: Sender<FireModeConfigMap>
    }
}