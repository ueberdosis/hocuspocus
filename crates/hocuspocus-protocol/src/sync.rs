//! y-protocols sync message codec (`y-protocols/sync`).
//!
//! A sync payload (the bytes following `MessageType::Sync`/`SyncReply` in
//! the envelope) is `[varUint subtype][varUint8Array body]`:
//!
//! - Step1: body = state vector
//! - Step2: body = update diff against the requester's state vector
//! - Update: body = incremental update
//!
//! Bodies are opaque yjs update (v1) / state-vector bytes; applying them to
//! a document is the engine's job (yrs), not this crate's.

use bytes::Bytes;

use crate::types::SyncMessageType;
use crate::varint::{Reader, Writer};
use crate::ProtocolError;

/// A decoded y-protocols sync message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SyncMessage {
    /// `[0][varUint8Array state vector]`
    Step1 { state_vector: Bytes },
    /// `[1][varUint8Array update]`
    Step2 { update: Bytes },
    /// `[2][varUint8Array update]`
    Update { update: Bytes },
}

impl SyncMessage {
    pub fn decode(reader: &mut Reader) -> Result<Self, ProtocolError> {
        match SyncMessageType::try_from(reader.read_var_uint()?)? {
            SyncMessageType::Step1 => Ok(Self::Step1 {
                state_vector: reader.read_var_bytes()?,
            }),
            SyncMessageType::Step2 => Ok(Self::Step2 {
                update: reader.read_var_bytes()?,
            }),
            SyncMessageType::Update => Ok(Self::Update {
                update: reader.read_var_bytes()?,
            }),
        }
    }

    pub fn encode(&self, writer: &mut Writer) {
        match self {
            Self::Step1 { state_vector } => {
                writer.write_var_uint(SyncMessageType::Step1 as u64);
                writer.write_var_bytes(state_vector);
            }
            Self::Step2 { update } => {
                writer.write_var_uint(SyncMessageType::Step2 as u64);
                writer.write_var_bytes(update);
            }
            Self::Update { update } => {
                writer.write_var_uint(SyncMessageType::Update as u64);
                writer.write_var_bytes(update);
            }
        }
    }

    /// Encodes into a standalone payload buffer (what goes after the
    /// envelope's message type).
    pub fn to_payload(&self) -> Bytes {
        let mut writer = Writer::new();
        self.encode(&mut writer);
        writer.freeze()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        for message in [
            SyncMessage::Step1 {
                state_vector: Bytes::from_static(&[0]),
            },
            SyncMessage::Step2 {
                update: Bytes::from_static(&[1, 2, 3, 4]),
            },
            SyncMessage::Update {
                update: Bytes::from_static(&[5, 6]),
            },
        ] {
            let mut reader = Reader::new(message.to_payload());
            assert_eq!(SyncMessage::decode(&mut reader).unwrap(), message);
            assert!(!reader.has_content());
        }
    }

    #[test]
    fn known_layout() {
        // Step1 with the empty-doc state vector [0]:
        // subtype 0, length 1, byte 0.
        let payload = SyncMessage::Step1 {
            state_vector: Bytes::from_static(&[0]),
        }
        .to_payload();
        assert_eq!(&payload[..], &[0, 1, 0]);
    }

    #[test]
    fn unknown_subtype_errors() {
        let mut reader = Reader::new(Bytes::from_static(&[7, 0]));
        assert_eq!(
            SyncMessage::decode(&mut reader).unwrap_err(),
            ProtocolError::UnknownSyncMessageType(7)
        );
    }
}
