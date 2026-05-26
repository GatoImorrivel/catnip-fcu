use std::time::Instant;

use catnip_core::FCU;
use catnip_core::protocol::{Request, Transport};
use catnip_core::requests::errors::UpdateFireModeConfigError;
use catnip_core::requests::{HostToFCURequest, push_events::FCUToHostEvent};

use esp_idf_svc::hal::delay::FreeRtos;
use esp_idf_svc::hal::modem::Modem;
use esp_idf_svc::nvs::EspDefaultNvsPartition;

use crate::ESP32FireModeConfigStorage;
use crate::{BluetoothTransport, BluetoothTransportConfig, CATNIP_FCU_REFERENCE_MANUFACTURER_ID};

pub struct ESP32FCUServer<F: FCU> {
    fcu: F,
    transport: BluetoothTransport,
    storage: ESP32FireModeConfigStorage,
}

impl<F: FCU> ESP32FCUServer<F> {
    pub fn new(fcu: F, modem: Modem, nvs: EspDefaultNvsPartition) -> anyhow::Result<Self> {
        let device_name = fcu.characteristics().name;
        let transport = BluetoothTransport::new(
            modem,
            nvs.clone(),
            BluetoothTransportConfig::new(device_name, CATNIP_FCU_REFERENCE_MANUFACTURER_ID),
        )?;

        let storage = ESP32FireModeConfigStorage::new(nvs.clone())?;

        Ok(Self {
            fcu,
            transport,
            storage,
        })
    }

    pub fn run(mut self) {
        let mut last_shot_instant = Instant::now();
        let mut old_position = self
            .fcu
            .poll_selector_position()
            .expect("Fire selector failure");
        loop {
            let new_position = self
                .fcu
                .poll_selector_position()
                .expect("Fire selector failure");

            let (firemode, config) = self.fcu.get_firemode_for_position(old_position);
            match self
                .fcu
                .fire_cycle(firemode, config, last_shot_instant, Instant::now())
            {
                Err(err) => log::error!("{err}"),
                Ok(result) => match result {
                    catnip_core::FireResult::Shot => last_shot_instant = Instant::now(),
                    catnip_core::FireResult::Skipped => (),
                },
            }

            if old_position != new_position {
                old_position = new_position;
                if let Err(err) = self
                    .transport
                    .emit(FCUToHostEvent::SelectorPositionChange(new_position))
                {
                    log::error!("Failed to emit fire selector change {err}");
                }
            }

            self.poll_transport();

            FreeRtos::delay_ms(1);
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
            HostToFCURequest::GetCurrentFireSelectorPosition(req) => {
                let position = self.fcu.poll_selector_position()?;
                req.reply(position, &mut self.transport)?;
            }
            HostToFCURequest::GetFireModeForPosition(req) => {
                let (firemode, config) = self.fcu.get_firemode_for_position(req.position);
                req.reply((firemode.into(), config.into()), &mut self.transport)?;
            }
            HostToFCURequest::GetFireModeConfigFields(req) => {
                let config = self
                    .fcu
                    .get_firemode_fields(req.firemode_name.clone().try_into()?);
                req.reply(config, &mut self.transport)?;
            }
            HostToFCURequest::GetSupportedFireModes(req) => {
                let firemodes = self
                    .fcu
                    .get_supported_firemodes()
                    .iter()
                    .map(|i| F::FireModes::into(i.clone()))
                    .collect();
                req.reply(firemodes, &mut self.transport)?;
            }
            HostToFCURequest::UpdateFireModeConfig(req) => {
                let firemode: F::FireModes = match req.firemode_name.clone().try_into() {
                    Ok(v) => v,
                    Err(_) => {
                        req.reply(
                            Err(UpdateFireModeConfigError::UnsupportedFireMode),
                            &mut self.transport,
                        )?;
                        return Ok(());
                    }
                };

                let config = match (firemode.clone(), req.config.clone()).try_into() {
                    Ok(config) => config,
                    _ => {
                        req.reply(
                            Err(UpdateFireModeConfigError::InvalidConfig),
                            &mut self.transport,
                        )?;
                        return Ok(());
                    }
                };

                self.fcu
                    .update_firemode_for_position(req.position, firemode, config)?;
                req.reply(Ok(()), &mut self.transport)?;
            }
        }
        Ok(())
    }
}
