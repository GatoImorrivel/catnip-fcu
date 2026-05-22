use std::fmt::Debug;

use catnip_core::Characteristics;

pub trait Transport {
    fn try_receive(&mut self) -> Option<HostToFCURequest>;
    fn reply<R: Debug + Clone>(&mut self, response: R) -> anyhow::Result<()>;
}

pub trait Request {
    type Reply: Debug + Clone;

    fn reply(&self, reply: Self::Reply, transport: &mut impl Transport) -> anyhow::Result<()>;
}

pub struct GetCapabilitiesRequest;

impl Request for GetCapabilitiesRequest {
    type Reply = Characteristics;

    fn reply(&self, reply: Self::Reply, transport: &mut impl Transport) -> anyhow::Result<()> {
        transport.reply(reply)?;
        Ok(())
    }
}

pub enum HostToFCURequest {
    GetCapabilities(GetCapabilitiesRequest),
}