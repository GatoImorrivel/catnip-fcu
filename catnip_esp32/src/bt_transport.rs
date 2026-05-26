use std::fmt::Debug;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};

use anyhow::{Context, anyhow};
use catnip_core::ble::{
    catnip_manufacturer_data, CATNIP_FCU_SERVICE_UUID, FCU_TO_HOST_UUID, HOST_TO_FCU_UUID,
};
use catnip_core::protocol;
use catnip_core::{protocol::*, requests::HostToFCURequest};

use crate::protocol_trace;
use enumset::enum_set;
use esp_idf_svc::bt::ble::gap::{AdvConfiguration, BleGapEvent, EspBleGap};
use esp_idf_svc::bt::ble::gatt::server::{ConnectionId, EspGatts, GattsEvent, TransferId};
use esp_idf_svc::bt::ble::gatt::{
    AutoResponse, GattCharacteristic, GattDescriptor, GattId, GattInterface, GattResponse,
    GattServiceId, GattStatus, Handle, Permission, Property,
};
use esp_idf_svc::bt::{BdAddr, Ble, BtDriver, BtStatus, BtUuid};
use esp_idf_svc::hal::modem::Modem;
use esp_idf_svc::nvs::EspDefaultNvsPartition;
use esp_idf_svc::sys::{ESP_FAIL, EspError};
use log::warn;
use serde::Serialize;
use uuid::Uuid;

const APP_ID: u16 = 0;
const CCCD_NOTIFY: u16 = 0x0001;

/// Reference manufacturer ID for this catnip-fcu product (not assigned by the framework).
pub const CATNIP_FCU_REFERENCE_MANUFACTURER_ID: u16 = 0x0CFC;

pub struct BluetoothTransportConfig {
    pub device_name: String,
    pub manufacturer_id: u16,
}

impl BluetoothTransportConfig {
    pub fn new(device_name: impl Into<String>, manufacturer_id: u16) -> Self {
        Self {
            device_name: device_name.into(),
            manufacturer_id,
        }
    }
}

pub struct BluetoothTransport {
    rx: mpsc::Receiver<HostToFCURequest>,
    server: Arc<BleGattServer>,
}

impl BluetoothTransport {
    pub fn new(
        modem: Modem,
        nvs: EspDefaultNvsPartition,
        config: BluetoothTransportConfig,
    ) -> anyhow::Result<Self> {
        let (request_tx, rx) = mpsc::channel();

        let bt = Arc::new(
            BtDriver::new(modem, Some(nvs)).context("failed to initialize BLE controller")?,
        );

        let server = Arc::new(BleGattServer::new(
            Arc::new(EspBleGap::new(bt.clone()).context("failed to initialize BLE GAP")?),
            Arc::new(EspGatts::new(bt.clone()).context("failed to initialize BLE GATTS")?),
            request_tx,
            config,
        ));

        let gap_server = server.clone();
        server.gap.subscribe(move |event| {
            gap_server.check_esp_status(gap_server.on_gap_event(event));
        })?;

        let gatts_server = server.clone();
        server.gatts.subscribe(move |(gatt_if, event)| {
            gatts_server.check_esp_status(gatts_server.on_gatts_event(gatt_if, event));
        })?;

        server.gatts.register_app(APP_ID)?;

        Ok(Self { rx, server })
    }
}

impl Transport for BluetoothTransport {
    fn try_receive(&mut self) -> Option<HostToFCURequest> {
        self.rx.try_recv().ok()
    }

    fn reply<R: Debug + Clone + Serialize>(
        &mut self,
        message_id: Uuid,
        response: R,
    ) -> anyhow::Result<()> {
        protocol_trace::log_outbound_reply(&message_id, &response);
        let frame = protocol::encode_reply_frame(message_id, &response)?;
        self.server.notify_host(&frame)
    }

    fn emit<E: Serialize + Debug>(&mut self, event: E) -> anyhow::Result<()> {
        protocol_trace::log_outbound_event(&event);
        let frame = protocol::encode_event(&event)?;
        self.server.notify_host(&frame)
    }
}

type ExBtDriver = BtDriver<'static, Ble>;
type ExEspBleGap = Arc<EspBleGap<'static, Ble, Arc<ExBtDriver>>>;
type ExEspGatts = Arc<EspGatts<'static, Ble, Arc<ExBtDriver>>>;

#[derive(Debug, Clone)]
struct Connection {
    peer: BdAddr,
    conn_id: Handle,
    subscribed: bool,
}

#[derive(Default)]
struct BleState {
    gatt_if: Option<GattInterface>,
    service_handle: Option<Handle>,
    rx_handle: Option<Handle>,
    tx_handle: Option<Handle>,
    tx_cccd_handle: Option<Handle>,
    connections: Option<Connection>,
    response: GattResponse,
    recv_buffer: Vec<u8>,
    device_name: String,
    manufacturer_data: Vec<u8>,
    adv_configured: bool,
    scan_rsp_configured: bool,
    advertising_started: bool,
}

struct BleGattServer {
    gap: ExEspBleGap,
    gatts: ExEspGatts,
    state: Arc<Mutex<BleState>>,
    request_tx: mpsc::Sender<HostToFCURequest>,
}

impl BleGattServer {
    fn new(
        gap: ExEspBleGap,
        gatts: ExEspGatts,
        request_tx: mpsc::Sender<HostToFCURequest>,
        config: BluetoothTransportConfig,
    ) -> Self {
        Self {
            gap,
            gatts,
            state: Arc::new(Mutex::new(BleState {
                device_name: config.device_name,
                manufacturer_data: catnip_manufacturer_data(config.manufacturer_id),
                ..Default::default()
            })),
            request_tx,
        }
    }

    fn notify_host(&self, frame: &[u8]) -> anyhow::Result<()> {
        let (gatt_if, tx_handle, conn_id) = {
            let state = self.state.lock().unwrap();
            let gatt_if = state
                .gatt_if
                .ok_or_else(|| anyhow!("BLE GATT interface not ready"))?;
            let tx_handle = state
                .tx_handle
                .ok_or_else(|| anyhow!("TX characteristic not ready"))?;
            let conn = state
                .connections
                .as_ref()
                .filter(|conn| conn.subscribed)
                .ok_or_else(|| anyhow!("no subscribed BLE client"))?;
            (gatt_if, tx_handle, conn.conn_id)
        };

        self.gatts
            .notify(gatt_if, conn_id, tx_handle, frame)
            .context("failed to send BLE notification")?;

        Ok(())
    }

    fn on_gap_event(&self, event: BleGapEvent) -> Result<(), EspError> {
        match event {
            BleGapEvent::AdvertisingConfigured(status) => {
                self.check_bt_status(status)?;
                self.state.lock().unwrap().adv_configured = true;
                self.maybe_start_advertising()?;
            }
            BleGapEvent::ScanResponseConfigured(status) => {
                self.check_bt_status(status)?;
                self.state.lock().unwrap().scan_rsp_configured = true;
                self.maybe_start_advertising()?;
            }
            _ => (),
        }

        Ok(())
    }

    fn maybe_start_advertising(&self) -> Result<(), EspError> {
        let mut state = self.state.lock().unwrap();

        if state.adv_configured && state.scan_rsp_configured && !state.advertising_started {
            state.advertising_started = true;
            drop(state);
            self.gap.start_advertising()?;
        }

        Ok(())
    }

    fn on_gatts_event(&self, gatt_if: GattInterface, event: GattsEvent) -> Result<(), EspError> {
        match event {
            GattsEvent::ServiceRegistered { status, app_id } => {
                self.check_gatt_status(status)?;
                if APP_ID == app_id {
                    self.create_service(gatt_if)?;
                }
            }
            GattsEvent::ServiceCreated {
                status,
                service_handle,
                ..
            } => {
                self.check_gatt_status(status)?;
                self.configure_and_start_service(service_handle)?;
            }
            GattsEvent::CharacteristicAdded {
                status,
                attr_handle,
                service_handle,
                char_uuid,
            } => {
                self.check_gatt_status(status)?;
                self.register_characteristic(service_handle, attr_handle, char_uuid)?;
            }
            GattsEvent::DescriptorAdded {
                status,
                attr_handle,
                service_handle,
                descr_uuid,
            } => {
                self.check_gatt_status(status)?;
                self.register_cccd_descriptor(service_handle, attr_handle, descr_uuid)?;
            }
            GattsEvent::PeerConnected { conn_id, addr, .. } => {
                self.create_conn(conn_id, addr)?;
            }
            GattsEvent::PeerDisconnected { addr, .. } => {
                self.delete_conn(addr)?;
            }
            GattsEvent::Write {
                conn_id,
                trans_id,
                addr,
                handle,
                offset,
                need_rsp,
                is_prep,
                value,
            } => {
                let handled = self.recv(
                    gatt_if, conn_id, trans_id, addr, handle, offset, need_rsp, is_prep, value,
                )?;

                if handled {
                    self.send_write_response(
                        gatt_if, conn_id, trans_id, handle, offset, need_rsp, is_prep, value,
                    )?;
                }
            }
            _ => (),
        }

        Ok(())
    }

    fn create_service(&self, gatt_if: GattInterface) -> Result<(), EspError> {
        let mut state = self.state.lock().unwrap();
        state.gatt_if = Some(gatt_if);

        self.gap.set_device_name(&state.device_name)?;

        // Legacy ADV packets are capped at 31 bytes. Keep discovery fields here;
        // put the device name and TX power in the scan response packet.
        let adv = AdvConfiguration {
            include_name: false,
            include_txpower: false,
            flag: 2,
            service_uuid: Some(BtUuid::uuid128(CATNIP_FCU_SERVICE_UUID)),
            manufacturer_data: Some(&state.manufacturer_data),
            ..Default::default()
        };
        self.gap.set_adv_conf(&adv)?;

        let scan_rsp = AdvConfiguration {
            set_scan_rsp: true,
            include_name: true,
            include_txpower: true,
            ..Default::default()
        };
        self.gap.set_adv_conf(&scan_rsp)?;
        drop(state);
        self.gatts.create_service(
            gatt_if,
            &GattServiceId {
                id: GattId {
                    uuid: BtUuid::uuid128(CATNIP_FCU_SERVICE_UUID),
                    inst_id: 0,
                },
                is_primary: true,
            },
            8,
        )?;

        Ok(())
    }

    fn configure_and_start_service(&self, service_handle: Handle) -> Result<(), EspError> {
        self.state.lock().unwrap().service_handle = Some(service_handle);
        self.gatts.start_service(service_handle)?;
        self.add_characteristics(service_handle)?;
        Ok(())
    }

    fn add_characteristics(&self, service_handle: Handle) -> Result<(), EspError> {
        self.gatts.add_characteristic(
            service_handle,
            &GattCharacteristic {
                uuid: BtUuid::uuid128(HOST_TO_FCU_UUID),
                permissions: enum_set!(Permission::Write),
                properties: enum_set!(Property::Write),
                max_len: 256,
                auto_rsp: AutoResponse::ByApp,
            },
            &[],
        )?;

        self.gatts.add_characteristic(
            service_handle,
            &GattCharacteristic {
                uuid: BtUuid::uuid128(FCU_TO_HOST_UUID),
                permissions: enum_set!(Permission::Read),
                properties: enum_set!(Property::Notify),
                max_len: 256,
                auto_rsp: AutoResponse::ByApp,
            },
            &[],
        )?;

        Ok(())
    }

    fn register_characteristic(
        &self,
        service_handle: Handle,
        attr_handle: Handle,
        char_uuid: BtUuid,
    ) -> Result<(), EspError> {
        let notify_char = {
            let mut state = self.state.lock().unwrap();

            if state.service_handle != Some(service_handle) {
                false
            } else if char_uuid == BtUuid::uuid128(HOST_TO_FCU_UUID) {
                state.rx_handle = Some(attr_handle);
                false
            } else if char_uuid == BtUuid::uuid128(FCU_TO_HOST_UUID) {
                state.tx_handle = Some(attr_handle);
                true
            } else {
                false
            }
        };

        if notify_char {
            self.gatts.add_descriptor(
                service_handle,
                &GattDescriptor {
                    uuid: BtUuid::uuid16(0x2902),
                    permissions: enum_set!(Permission::Read | Permission::Write),
                },
            )?;
        }

        Ok(())
    }

    fn register_cccd_descriptor(
        &self,
        service_handle: Handle,
        attr_handle: Handle,
        descr_uuid: BtUuid,
    ) -> Result<(), EspError> {
        let mut state = self.state.lock().unwrap();

        if descr_uuid == BtUuid::uuid16(0x2902) && state.service_handle == Some(service_handle) {
            state.tx_cccd_handle = Some(attr_handle);
        }

        Ok(())
    }

    fn create_conn(&self, conn_id: ConnectionId, addr: BdAddr) -> Result<(), EspError> {
        let mut state = self.state.lock().unwrap();

        if state.connections.is_none() {
            state.connections = Some(Connection {
                peer: addr,
                conn_id,
                subscribed: false,
            });
            drop(state);
            self.gap.set_conn_params_conf(addr, 10, 20, 0, 400)?;
        }

        Ok(())
    }

    fn delete_conn(&self, addr: BdAddr) -> Result<(), EspError> {
        let mut state = self.state.lock().unwrap();

        if state
            .connections
            .as_ref()
            .is_some_and(|conn| conn.peer == addr)
        {
            state.connections = None;
            drop(state);
            self.gap.start_advertising()?;
        }

        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    fn recv(
        &self,
        _gatt_if: GattInterface,
        conn_id: ConnectionId,
        _trans_id: TransferId,
        _addr: BdAddr,
        handle: Handle,
        offset: u16,
        _need_rsp: bool,
        _is_prep: bool,
        value: &[u8],
    ) -> Result<bool, EspError> {
        let mut state = self.state.lock().unwrap();

        let rx_handle = state.rx_handle;
        let tx_cccd_handle = state.tx_cccd_handle;

        let Some(conn) = state.connections.as_mut() else {
            return Ok(false);
        };

        if conn.conn_id != conn_id {
            return Ok(false);
        }

        if Some(handle) == tx_cccd_handle {
            if offset == 0 && value.len() == 2 {
                let cccd = u16::from_le_bytes([value[0], value[1]]);
                conn.subscribed = cccd == CCCD_NOTIFY;
            }
        } else if Some(handle) == rx_handle {
            if offset == 0 {
                state.recv_buffer.clear();
            }

            let start = offset as usize;
            if start > state.recv_buffer.len() {
                state.recv_buffer.resize(start, 0);
            }
            let end = start + value.len();
            if end > state.recv_buffer.len() {
                state.recv_buffer.resize(end, 0);
            }
            state.recv_buffer[start..end].copy_from_slice(value);

            match protocol::decode_request(&state.recv_buffer) {
                Ok(request) => {
                    protocol_trace::log_inbound(&request);
                    state.recv_buffer.clear();
                    if self.request_tx.send(request).is_err() {
                        warn!("BLE request channel closed");
                    }
                }
                Err(postcard::Error::DeserializeUnexpectedEnd) => {
                    // Full frame not received yet (long writes may arrive in chunks).
                }
                Err(err) => {
                    warn!(
                        "BLE request decode failed (buffer len {}): {err}",
                        state.recv_buffer.len()
                    );
                    state.recv_buffer.clear();
                }
            }
        } else {
            return Ok(false);
        }

        Ok(true)
    }

    #[allow(clippy::too_many_arguments)]
    fn send_write_response(
        &self,
        gatt_if: GattInterface,
        conn_id: ConnectionId,
        trans_id: TransferId,
        handle: Handle,
        offset: u16,
        need_rsp: bool,
        is_prep: bool,
        value: &[u8],
    ) -> Result<(), EspError> {
        if !need_rsp {
            return Ok(());
        }

        if is_prep {
            let mut state = self.state.lock().unwrap();

            state
                .response
                .attr_handle(handle)
                .auth_req(0)
                .offset(offset)
                .value(value)
                .map_err(|_| EspError::from_infallible::<ESP_FAIL>())?;

            self.gatts.send_response(
                gatt_if,
                conn_id,
                trans_id,
                GattStatus::Ok,
                Some(&state.response),
            )?;
        } else {
            self.gatts
                .send_response(gatt_if, conn_id, trans_id, GattStatus::Ok, None)?;
        }

        Ok(())
    }

    fn check_esp_status(&self, status: Result<(), EspError>) {
        if let Err(err) = status {
            warn!("BLE error: {err:?}");
        }
    }

    fn check_bt_status(&self, status: BtStatus) -> Result<(), EspError> {
        if !matches!(status, BtStatus::Success) {
            warn!("BLE status: {status:?}");
            Err(EspError::from_infallible::<ESP_FAIL>())
        } else {
            Ok(())
        }
    }

    fn check_gatt_status(&self, status: GattStatus) -> Result<(), EspError> {
        if !matches!(status, GattStatus::Ok) {
            warn!("GATT status: {status:?}");
            Err(EspError::from_infallible::<ESP_FAIL>())
        } else {
            Ok(())
        }
    }
}
