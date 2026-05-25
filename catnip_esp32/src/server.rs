use catnip_core::FCUConfig;
use catnip_core::protocol::{Request, Transport};
use catnip_core::requests::{HostToFCURequest, push_events::FCUToHostEvent};

use esp_idf_svc::hal::delay::FreeRtos;
use esp_idf_svc::hal::modem::Modem;
use esp_idf_svc::nvs::EspDefaultNvsPartition;

use crate::ESP32FCU;
use crate::{BluetoothTransport, BluetoothTransportConfig};

pub struct ESP32FCUServer<F: FCUConfig + ESP32FCU> {
    fcu: F,
    transport: BluetoothTransport,
}

impl<F: FCUConfig + ESP32FCU> ESP32FCUServer<F> {
    pub fn new(fcu: F, modem: Modem, nvs: EspDefaultNvsPartition) -> anyhow::Result<Self> {
        let device_name = fcu.characteristics().name;
        let transport =
            BluetoothTransport::new(modem, nvs, BluetoothTransportConfig::new(device_name))?;

        Ok(Self { fcu, transport })
    }


    pub fn run(mut self) {
        loop {
            let old_firemode = self.fcu.get_current_firemode();

            if let Err(err) = self.fcu.routine() {
                log::error!("{err}");
            }

            let new_firemode = self.fcu.get_current_firemode();

            if (old_firemode != new_firemode) {
                self.transport
                    .emit(FCUToHostEvent::FireModeChange(new_firemode))
                    .unwrap();
            }

            self.poll_transport();

            FreeRtos::delay_ms(20);
        }
    }

    fn poll_transport(&mut self) {
        while let Some(request) = self.transport.try_receive() {
            if let Err(err) = self.handle_request(request) {
                log::error!("{err}");
            }
        }
    }

    fn handle_request(&mut self, request: HostToFCURequest) -> anyhow::Result<()> {
        match request {
            HostToFCURequest::GetCharacteristcs(req) => {
                req.reply(self.fcu.characteristics(), &mut self.transport)?;
            }
            HostToFCURequest::GetFireModeConfig(req) => {
                let config = self.fcu.get_firemode_config(req.firemode);
                if let Some(config) = config {
                    use catnip_core::FireModeConfig;
                    req.reply(Some(config.fields()), &mut self.transport)?;
                } else {
                    req.reply(None, &mut self.transport)?;
                }
            }
            HostToFCURequest::UpdateFireModeConfig(req) => {
                let config = self.fcu.get_firemode_config(req.firemode);
            }
            HostToFCURequest::GetCurrentFireMode(req) => {
                req.reply(self.fcu.get_current_firemode(), &mut self.transport)?;
            }
        }
        Ok(())
    }
}
