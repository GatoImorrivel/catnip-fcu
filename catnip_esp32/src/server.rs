use std::time::Instant;

use catnip_core::firemode::{FireMode, PersistableFireModeAssignment};
use catnip_core::protocol::{Request, Transport};
use catnip_core::requests::errors::UpdateFireModeConfigError;
use catnip_core::requests::{HostToFCURequest, push_events::FCUToHostEvent};
use catnip_core::FCU;

use esp_idf_svc::hal::delay::FreeRtos;
use esp_idf_svc::hal::modem::Modem;
use esp_idf_svc::nvs::EspDefaultNvsPartition;

use crate::debug_console::DebugConsole;
use crate::ESP32PositionAssignmentStorage;
use crate::{BluetoothTransport, BluetoothTransportConfig, CATNIP_FCU_REFERENCE_MANUFACTURER_ID};

pub struct ESP32FCUServer<F: FCU> {
    fcu: F,
    transport: BluetoothTransport,
    storage: ESP32PositionAssignmentStorage,
    debug_console: DebugConsole,
}

impl<F: FCU> ESP32FCUServer<F> {
    pub fn new(
        fcu: F,
        modem: Modem,
        nvs: EspDefaultNvsPartition,
        storage: ESP32PositionAssignmentStorage,
    ) -> anyhow::Result<Self> {
        let device_name = fcu.characteristics().name;
        let transport = BluetoothTransport::new(
            modem,
            nvs,
            BluetoothTransportConfig::new(device_name, CATNIP_FCU_REFERENCE_MANUFACTURER_ID),
        )?;

        Ok(Self {
            fcu,
            transport,
            storage,
            debug_console: DebugConsole::default(),
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

            let mode = self.fcu.assignment_for_position(old_position);
            match self
                .fcu
                .fire_cycle(mode, last_shot_instant, Instant::now())
            {
                Err(err) => log::error!("{err}"),
                Ok(result) => match result {
                    catnip_core::FireResult::Shot => last_shot_instant = Instant::now(),
                    catnip_core::FireResult::Skipped => (),
                },
            }

            if old_position != new_position {
                let assignment = self.fcu.assignment_for_position(new_position);
                old_position = new_position;
                if let Err(err) = self
                    .transport
                    .emit(FCUToHostEvent::SelectorPositionChange(new_position))
                {
                    log::error!("Failed to emit fire selector change {err}");
                }
                if let Err(err) = self.transport.emit(FCUToHostEvent::FireModeChange(
                    assignment.wire_name().to_string(),
                )) {
                    log::error!("Failed to emit fire mode change {err}");
                }
            }

            self.poll_transport();
            self.debug_console.poll(&mut self.fcu);

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
                let assignment = self.fcu.assignment_for_position(req.position);
                req.reply(
                    (
                        assignment.wire_name().to_string(),
                        assignment.values(),
                    ),
                    &mut self.transport,
                )?;
            }
            HostToFCURequest::GetFireModeConfigFields(req) => {
                let schema = F::FireMode::from_name_for_schema(&req.firemode_name)?.schema();
                req.reply(schema, &mut self.transport)?;
            }
            HostToFCURequest::GetSupportedFireModes(req) => {
                let firemodes = self
                    .fcu
                    .supported_modes()
                    .iter()
                    .map(|mode| mode.wire_name().to_string())
                    .collect();
                req.reply(firemodes, &mut self.transport)?;
            }
            HostToFCURequest::UpdateFireModeConfig(req) => {
                if F::FireMode::from_name_for_schema(&req.firemode_name).is_err() {
                    req.reply(
                        Err(UpdateFireModeConfigError::UnsupportedFireMode),
                        &mut self.transport,
                    )?;
                    return Ok(());
                }

                let assignment = match F::FireMode::from_wire(&req.firemode_name, req.config.clone())
                {
                    Ok(assignment) => assignment,
                    Err(_) => {
                        req.reply(
                            Err(UpdateFireModeConfigError::InvalidConfig),
                            &mut self.transport,
                        )?;
                        return Ok(());
                    }
                };

                if self
                    .fcu
                    .set_assignment(req.position, assignment.clone())
                    .is_err()
                {
                    req.reply(
                        Err(UpdateFireModeConfigError::UnsupportedFireMode),
                        &mut self.transport,
                    )?;
                    return Ok(());
                }

                if let Err(err) = assignment.save_assignment(&self.storage, req.position) {
                    log::error!("failed to persist fire mode assignment: {err}");
                }
                req.reply(Ok(()), &mut self.transport)?;
            }
        }
        Ok(())
    }
}
