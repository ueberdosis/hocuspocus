//! Frame decoding and message building.

use bytes::Bytes;

use crate::address::DocumentAddress;
use crate::auth::AuthOutbound;
use crate::types::MessageType;
use crate::varint::{Reader, Writer};
use crate::ProtocolError;

/// A decoded WebSocket binary frame.
#[derive(Debug, Clone)]
pub enum Frame {
    /// Bare 1-byte frame `[0x09]`, no document address.
    Ping,
    /// Bare 1-byte frame `[0x0A]`, no document address.
    Pong,
    /// An addressed message.
    Message(Envelope),
}

/// An addressed wire message: `[varString address][varUint type][payload]`.
#[derive(Debug, Clone)]
pub struct Envelope {
    pub address: DocumentAddress,
    pub kind: MessageType,
    /// The type-specific payload — a zero-copy view into the frame buffer.
    pub payload: Bytes,
}

impl Frame {
    /// Decodes one binary WebSocket frame.
    ///
    /// A 1-byte frame containing `MessageType::Ping`/`Pong` is a
    /// connection-level liveness frame (the provider sends and expects these
    /// without an address). Everything else starts with a var-string address.
    pub fn decode(buf: Bytes) -> Result<Self, ProtocolError> {
        match buf.first() {
            None => Err(ProtocolError::EmptyFrame),
            Some(9) if buf.len() == 1 => Ok(Self::Ping),
            Some(10) if buf.len() == 1 => Ok(Self::Pong),
            Some(_) => {
                let mut reader = Reader::new(buf);
                let raw_address = reader.read_var_string()?;
                let kind = MessageType::try_from(reader.read_var_uint()?)?;
                Ok(Self::Message(Envelope {
                    address: DocumentAddress::parse(&raw_address),
                    kind,
                    payload: reader.rest(),
                }))
            }
        }
    }
}

/// Builds outbound frames. Mirrors `packages/server/src/OutgoingMessage.ts`:
/// the constructor writes the address, each method writes one message.
///
/// The finished frame is frozen into [`Bytes`] so a broadcast fan-out clones
/// a refcount, not the buffer.
#[derive(Debug)]
pub struct MessageBuilder {
    writer: Writer,
}

impl MessageBuilder {
    /// Starts a frame addressed with the connection's exact raw routing key.
    pub fn new(raw_address: &str) -> Self {
        let mut writer = Writer::with_capacity(64);
        writer.write_var_string(raw_address);
        Self { writer }
    }

    /// A bare connection-level ping/pong frame (no address).
    pub fn bare(kind: MessageType) -> Bytes {
        debug_assert!(matches!(kind, MessageType::Ping | MessageType::Pong));
        Bytes::from(vec![kind as u8])
    }

    /// `[Sync|SyncReply][raw y-protocols sync payload]`. The payload is the
    /// already-encoded y-protocols message (step1/step2/update).
    pub fn sync(mut self, kind: MessageType, sync_payload: &[u8]) -> Bytes {
        debug_assert!(matches!(kind, MessageType::Sync | MessageType::SyncReply));
        self.writer.write_var_uint(kind as u64);
        self.writer.write_raw(sync_payload);
        self.writer.freeze()
    }

    /// `[Awareness][varUint8Array update]`
    pub fn awareness(mut self, update: &[u8]) -> Bytes {
        self.writer.write_var_uint(MessageType::Awareness as u64);
        self.writer.write_var_bytes(update);
        self.writer.freeze()
    }

    /// `[QueryAwareness]`
    pub fn query_awareness(mut self) -> Bytes {
        self.writer
            .write_var_uint(MessageType::QueryAwareness as u64);
        self.writer.freeze()
    }

    /// `[Auth][…]`
    pub fn auth(mut self, message: &AuthOutbound) -> Bytes {
        self.writer.write_var_uint(MessageType::Auth as u64);
        message.encode(&mut self.writer);
        self.writer.freeze()
    }

    /// `[Stateless][varString payload]`
    pub fn stateless(mut self, payload: &str) -> Bytes {
        self.writer.write_var_uint(MessageType::Stateless as u64);
        self.writer.write_var_string(payload);
        self.writer.freeze()
    }

    /// `[BroadcastStateless][varString payload]` — server-internal relay.
    pub fn broadcast_stateless(mut self, payload: &str) -> Bytes {
        self.writer
            .write_var_uint(MessageType::BroadcastStateless as u64);
        self.writer.write_var_string(payload);
        self.writer.freeze()
    }

    /// `[CLOSE][varString reason]`
    pub fn close(mut self, reason: &str) -> Bytes {
        self.writer.write_var_uint(MessageType::Close as u64);
        self.writer.write_var_string(reason);
        self.writer.freeze()
    }

    /// `[SyncStatus][varUint 1|0]`
    pub fn sync_status(mut self, saved: bool) -> Bytes {
        self.writer.write_var_uint(MessageType::SyncStatus as u64);
        self.writer.write_var_uint(u64::from(saved));
        self.writer.freeze()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::{AuthInbound, Scope};

    fn decode_envelope(frame: Bytes) -> Envelope {
        match Frame::decode(frame).unwrap() {
            Frame::Message(envelope) => envelope,
            other => panic!("expected enveloped message, got {other:?}"),
        }
    }

    #[test]
    fn bare_ping_pong() {
        assert!(matches!(
            Frame::decode(Bytes::from_static(&[9])).unwrap(),
            Frame::Ping
        ));
        assert!(matches!(
            Frame::decode(Bytes::from_static(&[10])).unwrap(),
            Frame::Pong
        ));
        // A 1-byte frame that is not ping/pong is an (invalid) envelope, not
        // a liveness frame: 0x01 = address of length 1 with no bytes left.
        assert_eq!(
            Frame::decode(Bytes::from_static(&[1])).unwrap_err(),
            ProtocolError::UnexpectedEof
        );
    }

    #[test]
    fn empty_frame_errors() {
        assert_eq!(
            Frame::decode(Bytes::new()).unwrap_err(),
            ProtocolError::EmptyFrame
        );
    }

    #[test]
    fn sync_status_layout() {
        // Hand-derived: address "doc" = [3, b'd', b'o', b'c'], type 8, flag 1.
        let frame = MessageBuilder::new("doc").sync_status(true);
        assert_eq!(&frame[..], &[3, b'd', b'o', b'c', 8, 1]);

        let envelope = decode_envelope(frame);
        assert_eq!(envelope.kind, MessageType::SyncStatus);
        assert_eq!(&*envelope.address.document_name, "doc");
        assert_eq!(&envelope.payload[..], &[1]);
    }

    #[test]
    fn stateless_roundtrip() {
        let frame = MessageBuilder::new("doc").stateless("hello world");
        let envelope = decode_envelope(frame);
        assert_eq!(envelope.kind, MessageType::Stateless);
        let mut reader = Reader::new(envelope.payload);
        assert_eq!(reader.read_var_string().unwrap(), "hello world");
    }

    #[test]
    fn auth_handshake_roundtrip() {
        // Client → server token frame, exactly as AuthenticationMessage.ts
        // writes it: [address][Auth][Token][token][providerVersion].
        let mut writer = Writer::new();
        writer.write_var_string("doc");
        writer.write_var_uint(MessageType::Auth as u64);
        AuthInbound::Token {
            token: "s3cret".into(),
            provider_version: Some("4.3.0".into()),
        }
        .encode(&mut writer);

        let envelope = decode_envelope(writer.freeze());
        assert_eq!(envelope.kind, MessageType::Auth);
        let mut reader = Reader::new(envelope.payload);
        assert_eq!(
            AuthInbound::decode(&mut reader).unwrap(),
            AuthInbound::Token {
                token: "s3cret".into(),
                provider_version: Some("4.3.0".into()),
            }
        );

        // Server → client authenticated ack.
        let frame = MessageBuilder::new("doc").auth(&AuthOutbound::Authenticated {
            scope: Scope::ReadWrite,
        });
        let envelope = decode_envelope(frame);
        let mut reader = Reader::new(envelope.payload);
        assert_eq!(
            AuthOutbound::decode(&mut reader).unwrap(),
            AuthOutbound::Authenticated {
                scope: Scope::ReadWrite
            }
        );
    }

    #[test]
    fn session_address_is_echoed_raw() {
        let raw = "doc\0session-1";
        let frame = MessageBuilder::new(raw).sync_status(false);
        let envelope = decode_envelope(frame);
        assert_eq!(&*envelope.address.raw, raw);
        assert_eq!(&*envelope.address.document_name, "doc");
        assert_eq!(envelope.address.session_id.as_deref(), Some("session-1"));
    }

    #[test]
    fn sync_payload_is_passed_through_zero_copy() {
        let sync_payload = [0u8, 1, 0]; // Step1 + empty state vector
        let frame = MessageBuilder::new("doc").sync(MessageType::Sync, &sync_payload);
        let envelope = decode_envelope(frame);
        assert_eq!(envelope.kind, MessageType::Sync);
        assert_eq!(&envelope.payload[..], &sync_payload);
    }
}
