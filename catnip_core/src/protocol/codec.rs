//! Postcard encode/decode for host ↔ FCU BLE frames.
//!
//! Wire layout matches `catnip_esp32::bt_transport` and `catnip_app` message codecs.

use serde::{de::DeserializeOwned, Serialize};
use uuid::Uuid;

use crate::requests::{HostToFCURequest, push_events::FCUToHostEvent};

/// First byte on `FCU_TO_HOST` notifications: correlated reply.
pub const OUTBOUND_TAG_REPLY: u8 = 1;
/// First byte on `FCU_TO_HOST` notifications: push event.
pub const OUTBOUND_TAG_EVENT: u8 = 2;

#[derive(Serialize, serde::Deserialize)]
struct ReplyPacket<R> {
    message_id: Uuid,
    reply: R,
}

pub fn encode_request(request: &HostToFCURequest) -> Result<Vec<u8>, postcard::Error> {
    postcard::to_allocvec(request)
}

pub fn decode_request(buf: &[u8]) -> Result<HostToFCURequest, postcard::Error> {
    postcard::from_bytes(buf)
}

pub fn encode_reply_frame<R: Serialize + Clone>(
    message_id: Uuid,
    reply: &R,
) -> Result<Vec<u8>, postcard::Error> {
    let payload = postcard::to_allocvec(&ReplyPacket {
        message_id,
        reply: reply.clone(),
    })?;
    let mut frame = Vec::with_capacity(1 + payload.len());
    frame.push(OUTBOUND_TAG_REPLY);
    frame.extend(payload);
    Ok(frame)
}

pub fn decode_reply_frame<R: DeserializeOwned>(
    frame: &[u8],
) -> Result<(Uuid, R), postcard::Error> {
    let body = reply_body(frame)?;
    let packet: ReplyPacket<R> = postcard::from_bytes(body)?;
    Ok((packet.message_id, packet.reply))
}

pub fn encode_event<E: Serialize>(event: &E) -> Result<Vec<u8>, postcard::Error> {
    let payload = postcard::to_allocvec(event)?;
    let mut frame = Vec::with_capacity(1 + payload.len());
    frame.push(OUTBOUND_TAG_EVENT);
    frame.extend(payload);
    Ok(frame)
}

pub fn decode_event_frame(frame: &[u8]) -> Result<FCUToHostEvent, postcard::Error> {
    let body = event_body(frame)?;
    postcard::from_bytes(body)
}

fn reply_body(frame: &[u8]) -> Result<&[u8], postcard::Error> {
    frame_tag_body(frame, OUTBOUND_TAG_REPLY)
}

fn event_body(frame: &[u8]) -> Result<&[u8], postcard::Error> {
    frame_tag_body(frame, OUTBOUND_TAG_EVENT)
}

fn frame_tag_body<'a>(frame: &'a [u8], expected_tag: u8) -> Result<&'a [u8], postcard::Error> {
    let (tag, body) = frame
        .split_first()
        .ok_or(postcard::Error::DeserializeUnexpectedEnd)?;
    if *tag != expected_tag {
        return Err(postcard::Error::DeserializeBadEncoding);
    }
    Ok(body)
}
