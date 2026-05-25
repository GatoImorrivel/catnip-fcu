use std::fmt::Debug;

use catnip_core::{Characteristics, FireMode, FireModeConfigFields};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use uuid::Uuid;

#[macro_use]
mod macros;

mod push_events;
pub use push_events::*;

/// Transport for host ↔ FCU messages.
///
/// Request senders assign [`Uuid`]s; the receiver echoes the same `message_id` in replies.
pub trait Transport {
    fn try_receive(&mut self) -> Option<HostToFCURequest>;
    /// Send a reply correlated to the originating request via `message_id`.
    fn reply<R: Debug + Clone + Serialize>(&mut self, message_id: Uuid, response: R) -> anyhow::Result<()>;
    fn emit<E: Serialize>(&mut self, event: E) -> anyhow::Result<()>;
}

/// A request that can be answered through a [`Transport`].
///
/// Each request carries a `message_id` set by whoever sends it; the FCU must echo that
/// id when calling [`Request::reply`].
pub trait Request: DeserializeOwned {
    type Reply: Debug + Clone + Serialize;

    fn reply(&self, reply: Self::Reply, transport: &mut impl Transport) -> anyhow::Result<()>;
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum UpdateFireModeConfigError {
    InvalidConfig,
    UnsupportedFireMode
}

define_requests! {
    requests HostToFCURequest,
    responses HostToFCUResponse,
    {
        GetCharacteristcs => Characteristics,
        GetFireModeConfig {firemode: FireMode} => Option<FireModeConfigFields>,
        GetCurrentFireMode => FireMode,
        UpdateFireModeConfig {firemode:FireMode} => Option<UpdateFireModeConfigError>
    }
}