use catnip_core::FCUConfig;
use catnip_messages::{HostToFCURequest, Transport};

use esp_idf_svc::hal::modem::Modem;
#[cfg(all(
    feature = "bt",
    esp_idf_bt_enabled,
    esp_idf_bt_bluedroid_enabled,
    not(esp32s2)
))]
use esp_idf_svc::nvs::EspDefaultNvsPartition;

use crate::ESP32FCU;
#[cfg(all(
    feature = "bt",
    esp_idf_bt_enabled,
    esp_idf_bt_bluedroid_enabled,
    not(esp32s2)
))]
use crate::{BluetoothTransport, BluetoothTransportConfig};

pub struct ESP32FCUServer<F: FCUConfig + ESP32FCU> {
    fcu: F,
    #[cfg(all(
        feature = "bt",
        esp_idf_bt_enabled,
        esp_idf_bt_bluedroid_enabled,
        not(esp32s2)
    ))]
    transport: BluetoothTransport,
}

impl<F: FCUConfig + ESP32FCU> ESP32FCUServer<F> {
    #[cfg(all(
        feature = "bt",
        esp_idf_bt_enabled,
        esp_idf_bt_bluedroid_enabled,
        not(esp32s2)
    ))]
    pub fn new(
        fcu: F,
        modem: Modem,
        nvs: EspDefaultNvsPartition,
    ) -> anyhow::Result<Self> {
        let device_name = fcu.characteristics().name;
        let transport =
            BluetoothTransport::new(modem, nvs, BluetoothTransportConfig::new(device_name))?;

        Ok(Self { fcu, transport })
    }

    #[cfg(not(all(
        feature = "bt",
        esp_idf_bt_enabled,
        esp_idf_bt_bluedroid_enabled,
        not(esp32s2)
    )))]
    pub fn new(fcu: F) -> Self {
        Self { fcu }
    }

    pub fn run(mut self) {
        loop {
            if let Err(err) = self.fcu.routine() {
                log::error!("{err}");
            }

            #[cfg(all(
                feature = "bt",
                esp_idf_bt_enabled,
                esp_idf_bt_bluedroid_enabled,
                not(esp32s2)
            ))]
            self.poll_transport();
        }
    }

    #[cfg(all(
        feature = "bt",
        esp_idf_bt_enabled,
        esp_idf_bt_bluedroid_enabled,
        not(esp32s2)
    ))]
    fn poll_transport(&mut self) {
        while let Some(request) = self.transport.try_receive() {
            if let Err(err) = self.handle_request(request) {
                log::error!("{err}");
            }
        }
    }

    #[cfg(all(
        feature = "bt",
        esp_idf_bt_enabled,
        esp_idf_bt_bluedroid_enabled,
        not(esp32s2)
    ))]
    fn handle_request(&mut self, request: HostToFCURequest) -> anyhow::Result<()> {
        match request {
            HostToFCURequest::GetCapabilities(_req) => todo!(),
            HostToFCURequest::GetFireModeConfig(_req) => todo!(),
            HostToFCURequest::GetCurrentFireMode(_req) => todo!(),
        }
    }
}
