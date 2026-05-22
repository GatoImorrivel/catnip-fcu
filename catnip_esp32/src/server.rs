use std::sync::mpsc::{Receiver, Sender};

use catnip_core::FCUConfig;
use catnip_messages::{FCUToHostMessage, HostToFCUMessage};

use crate::ESP32FCU;

pub struct ESP32FCUServer<F: FCUConfig + ESP32FCU> {
    fcu: F,
    host_to_fcu_receiver: Receiver<HostToFCUMessage>,
    fcu_to_host_sender: Sender<FCUToHostMessage>,
}

impl<F: FCUConfig + ESP32FCU> ESP32FCUServer<F> {
    pub fn new(fcu: F) -> Self {
        todo!()
    }

    pub fn run(mut self) {
        loop {
            while let Ok(event) = self.host_to_fcu_receiver.try_recv() {
                if let Err(err) = self.handle_event(&event) {
                    log::error!("Failed to handle event {:?} {}", event, err);
                }
            }

            if let Err(err) = self.fcu.routine() {
                log::error!("{err}")
            }
        }
    }

    fn handle_event(&mut self, event: &HostToFCUMessage) -> anyhow::Result<()> {
        todo!()
    }
}
