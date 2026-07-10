//! Redis pub/sub frame codec, interoperable with
//! `packages/extension-redis/src/Redis.ts` (`encodeMessage`/`decodeMessage`).
//!
//! Layout: `[u8 identifier length][identifier utf8][hocuspocus wire message]`.
//! The identifier lets an instance drop its own echoes, since Redis pub/sub
//! delivers published messages back to the publisher. Because the length is
//! a single raw byte, identifiers are capped at 255 UTF-8 bytes (enforced at
//! configuration time; [`encode`] returns an error otherwise).

use bytes::{Bytes, BytesMut};

use crate::ProtocolError;

/// A decoded Redis pub/sub frame.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RedisFrame {
    /// Identifier of the publishing instance (e.g. `host-<uuid>`).
    pub identifier: String,
    /// The embedded hocuspocus wire message, zero-copy.
    pub message: Bytes,
}

/// Builds the channel key for a document: `{prefix}:{documentName}`.
pub fn channel_key(prefix: &str, document_name: &str) -> String {
    format!("{prefix}:{document_name}")
}

/// Builds the store-lock key for a document: `{prefix}:{documentName}:lock`.
pub fn lock_key(prefix: &str, document_name: &str) -> String {
    format!("{prefix}:{document_name}:lock")
}

pub fn encode(identifier: &str, message: &[u8]) -> Result<Bytes, ProtocolError> {
    let id = identifier.as_bytes();
    if id.is_empty() || id.len() > u8::MAX as usize {
        return Err(ProtocolError::InvalidRedisIdentifier(id.len()));
    }
    let mut buf = BytesMut::with_capacity(1 + id.len() + message.len());
    buf.extend_from_slice(&[id.len() as u8]);
    buf.extend_from_slice(id);
    buf.extend_from_slice(message);
    Ok(buf.freeze())
}

pub fn decode(frame: Bytes) -> Result<RedisFrame, ProtocolError> {
    let id_len = *frame.first().ok_or(ProtocolError::UnexpectedEof)? as usize;
    if frame.len() < 1 + id_len {
        return Err(ProtocolError::UnexpectedEof);
    }
    let identifier = std::str::from_utf8(&frame[1..1 + id_len])
        .map_err(|_| ProtocolError::InvalidUtf8)?
        .to_owned();
    Ok(RedisFrame {
        identifier,
        message: frame.slice(1 + id_len..),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let message = b"\x03doc\x08\x01"; // any wire message bytes
        let encoded = encode("host-abc", message).unwrap();
        let decoded = decode(encoded).unwrap();
        assert_eq!(decoded.identifier, "host-abc");
        assert_eq!(&decoded.message[..], message);
    }

    #[test]
    fn layout_matches_node_extension() {
        // Node: Buffer.concat([Buffer.from([id.length]), Buffer.from(id), message])
        let encoded = encode("ab", &[0xff]).unwrap();
        assert_eq!(&encoded[..], &[2, b'a', b'b', 0xff]);
    }

    #[test]
    fn identifier_length_limits() {
        assert!(matches!(
            encode("", b"x"),
            Err(ProtocolError::InvalidRedisIdentifier(0))
        ));
        let long = "x".repeat(256);
        assert!(matches!(
            encode(&long, b"x"),
            Err(ProtocolError::InvalidRedisIdentifier(256))
        ));
        let max = "x".repeat(255);
        assert!(encode(&max, b"x").is_ok());
    }

    #[test]
    fn keys() {
        assert_eq!(channel_key("hocuspocus", "doc"), "hocuspocus:doc");
        assert_eq!(lock_key("hocuspocus", "doc"), "hocuspocus:doc:lock");
    }
}
