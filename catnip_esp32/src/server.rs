use std::sync::mpsc::{Receiver, Sender};

use catnip_core::FCUConfig;
use catnip_messages::{FCUToHostMessage, HostToFCUErrors, HostToFCUMessage};

use crate::ESP32FCU;

pub struct ESP32FCUServer<F: FCUConfig + ESP32FCU> {
    fcu: F,
    host_to_fcu_receiver: Receiver<HostToFCUMessage>,
    fcu_to_host_sender: Sender<FCUToHostMessage>,
}

impl<F: FCUConfig + ESP32FCU> ESP32FCUServer<F> {
    pub fn run(mut self) {
        while let Ok(event) = self.host_to_fcu_receiver.try_recv() {
            if let Err(err) = self.handle_event(&event) {
                log::error!("Failed to handle event {:?} {}", event, err);
            }
        }

        let current_firemode = self.fcu.get_current_firemode();

        loop {
            self.fcu.routine();
        }

        let new_firemode = self.fcu.get_current_firemode();

        if new_firemode != current_firemode {
            self.fcu_to_host_sender
                .send(FCUToHostMessage::FireModeChange(new_firemode));
        }
    }

    fn handle_event(&mut self, event: &HostToFCUMessage) -> anyhow::Result<()> {
        match event {
            HostToFCUMessage::GetCapabilities { reply } => {
                if let Err(err) = reply.send(self.fcu.capabilities()) {
                    anyhow::bail!("Failed to send")
                }
            }
            HostToFCUMessage::GetFireModeConfig {
                target_firemode,
                reply,
            } => {
                let capabilities = self.fcu.capabilities();
                let does_support_firemode = capabilities
                    .supported_firemodes
                    .iter()
                    .find(|f| target_firemode == f);

                if let Some(firemode) = does_support_firemode {
                    if let Err(err) = reply.send(self.fcu.get_firemode_config(*firemode)) {
                        anyhow::bail!("Failed to send")
                    }
                } else {
                }
            }
        }

        anyhow::Ok(())
    }
}
