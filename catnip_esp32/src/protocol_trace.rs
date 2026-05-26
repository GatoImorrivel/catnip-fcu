use catnip_core::requests::HostToFCURequest;
use uuid::Uuid;

#[cfg(debug_assertions)]
pub fn log_inbound(request: &HostToFCURequest) {
    log::info!(target: "catnip_protocol", "RX host→FCU: {request:?}");
}

#[cfg(not(debug_assertions))]
pub fn log_inbound(_: &HostToFCURequest) {}

#[cfg(debug_assertions)]
pub fn log_outbound_reply<R: core::fmt::Debug>(message_id: &Uuid, reply: &R) {
    log::info!(
        target: "catnip_protocol",
        "TX FCU→host reply id={message_id} {reply:?}"
    );
}

#[cfg(not(debug_assertions))]
pub fn log_outbound_reply<R: core::fmt::Debug>(_message_id: &Uuid, _reply: &R) {}

#[cfg(debug_assertions)]
pub fn log_outbound_event<E: core::fmt::Debug>(event: &E) {
    log::info!(target: "catnip_protocol", "TX FCU→host event: {event:?}");
}

#[cfg(not(debug_assertions))]
pub fn log_outbound_event<E: core::fmt::Debug>(_event: &E) {}
