//! y-protocols awareness update codec (`y-protocols/awareness`).
//!
//! An awareness update (the bytes inside the envelope's varUint8Array for
//! `MessageType::Awareness`, and the reply to `QueryAwareness`) is:
//!
//! ```text
//! [varUint entryCount]
//! entryCount × [varUint clientId][varUint clock][varString stateJson]
//! ```
//!
//! `stateJson` is `JSON.stringify(state)`; a leaving client is encoded with
//! the literal string `null`. Decoding to structured entries is what lets
//! `before_handle_awareness` hooks mutate states as JSON before the update
//! is re-encoded and applied — replacing the scratch `Y.Doc` the TypeScript
//! server allocates per inbound awareness frame.

use bytes::Bytes;

use crate::varint::{Reader, Writer};
use crate::ProtocolError;

/// One client's awareness entry.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AwarenessEntry {
    pub client_id: u64,
    /// Lamport-style clock; a client's larger clock wins.
    pub clock: u64,
    /// The state as raw JSON text (`"null"` = client left). Kept as text so
    /// re-encoding untouched entries is byte-exact.
    pub state_json: String,
}

impl AwarenessEntry {
    /// Whether this entry removes the client (state is JSON `null`).
    pub fn is_removal(&self) -> bool {
        self.state_json == "null"
    }
}

/// A decoded awareness update.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct AwarenessUpdate {
    pub entries: Vec<AwarenessEntry>,
}

impl AwarenessUpdate {
    pub fn decode_bytes(bytes: Bytes) -> Result<Self, ProtocolError> {
        let mut reader = Reader::new(bytes);
        let update = Self::decode(&mut reader)?;
        Ok(update)
    }

    pub fn decode(reader: &mut Reader) -> Result<Self, ProtocolError> {
        let count = reader.read_var_uint()?;
        // An update carries at least ~3 bytes per entry; bound the
        // allocation by what the buffer could actually contain.
        if count > (reader.remaining() as u64) {
            return Err(ProtocolError::UnexpectedEof);
        }
        let mut entries = Vec::with_capacity(count as usize);
        for _ in 0..count {
            entries.push(AwarenessEntry {
                client_id: reader.read_var_uint()?,
                clock: reader.read_var_uint()?,
                state_json: reader.read_var_string()?,
            });
        }
        Ok(Self { entries })
    }

    pub fn encode(&self, writer: &mut Writer) {
        writer.write_var_uint(self.entries.len() as u64);
        for entry in &self.entries {
            writer.write_var_uint(entry.client_id);
            writer.write_var_uint(entry.clock);
            writer.write_var_string(&entry.state_json);
        }
    }

    pub fn to_bytes(&self) -> Bytes {
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
        let update = AwarenessUpdate {
            entries: vec![
                AwarenessEntry {
                    client_id: 3_651_849_638,
                    clock: 7,
                    state_json: r#"{"user":{"name":"jan"}}"#.into(),
                },
                AwarenessEntry {
                    client_id: 1,
                    clock: 2,
                    state_json: "null".into(),
                },
            ],
        };
        let decoded = AwarenessUpdate::decode_bytes(update.to_bytes()).unwrap();
        assert_eq!(decoded, update);
        assert!(!decoded.entries[0].is_removal());
        assert!(decoded.entries[1].is_removal());
    }

    #[test]
    fn empty_update() {
        let update = AwarenessUpdate::default();
        assert_eq!(&update.to_bytes()[..], &[0]);
        assert_eq!(
            AwarenessUpdate::decode_bytes(Bytes::from_static(&[0])).unwrap(),
            update
        );
    }

    #[test]
    fn absurd_count_is_rejected() {
        // count = 2^40 with a 3-byte buffer must not allocate.
        let mut writer = Writer::new();
        writer.write_var_uint(1 << 40);
        assert_eq!(
            AwarenessUpdate::decode_bytes(writer.freeze()).unwrap_err(),
            ProtocolError::UnexpectedEof
        );
    }
}
