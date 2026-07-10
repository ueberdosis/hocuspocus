//! Message type enums, mirroring `packages/server/src/types.ts` and
//! `packages/common/src/auth.ts` byte-for-byte.

use crate::ProtocolError;

/// Top-level message type, written as a var-uint after the document address.
///
/// Mirrors `MessageType` in `packages/server/src/types.ts`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum MessageType {
    /// Wraps a y-protocols sync message (see [`SyncMessageType`]).
    Sync = 0,
    Awareness = 1,
    Auth = 2,
    QueryAwareness = 3,
    /// Identical to [`MessageType::Sync`], but the receiver must not answer
    /// with a reciprocal SyncStep1 (prevents sync ping-pong).
    SyncReply = 4,
    Stateless = 5,
    /// Server-internal (Redis relay). Must be rejected when received from a
    /// client connection.
    BroadcastStateless = 6,
    Close = 7,
    /// Ack telling the client whether its update was applied/persisted.
    /// Payload: var-uint `1` (saved) or `0`.
    SyncStatus = 8,
    /// Connection-level liveness. Sent as a bare 1-byte frame `[0x09]`
    /// without a document address.
    Ping = 9,
    /// Bare 1-byte frame `[0x0A]`.
    Pong = 10,
}

impl TryFrom<u64> for MessageType {
    type Error = ProtocolError;

    fn try_from(value: u64) -> Result<Self, Self::Error> {
        Ok(match value {
            0 => Self::Sync,
            1 => Self::Awareness,
            2 => Self::Auth,
            3 => Self::QueryAwareness,
            4 => Self::SyncReply,
            5 => Self::Stateless,
            6 => Self::BroadcastStateless,
            7 => Self::Close,
            8 => Self::SyncStatus,
            9 => Self::Ping,
            10 => Self::Pong,
            other => return Err(ProtocolError::UnknownMessageType(other)),
        })
    }
}

/// Sub-type of an auth message. Mirrors `AuthMessageType` in
/// `packages/common/src/auth.ts`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum AuthMessageType {
    /// Client → server: carries the token. Server → client: bare token
    /// (re-)sync request without payload.
    Token = 0,
    PermissionDenied = 1,
    Authenticated = 2,
}

impl TryFrom<u64> for AuthMessageType {
    type Error = ProtocolError;

    fn try_from(value: u64) -> Result<Self, Self::Error> {
        Ok(match value {
            0 => Self::Token,
            1 => Self::PermissionDenied,
            2 => Self::Authenticated,
            other => return Err(ProtocolError::UnknownAuthMessageType(other)),
        })
    }
}

/// Sub-type of a sync message, defined by y-protocols (`y-protocols/sync`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum SyncMessageType {
    /// Payload: var-uint8array state vector.
    Step1 = 0,
    /// Payload: var-uint8array document update (diff against a state vector).
    Step2 = 1,
    /// Payload: var-uint8array incremental document update.
    Update = 2,
}

impl TryFrom<u64> for SyncMessageType {
    type Error = ProtocolError;

    fn try_from(value: u64) -> Result<Self, Self::Error> {
        Ok(match value {
            0 => Self::Step1,
            1 => Self::Step2,
            2 => Self::Update,
            other => return Err(ProtocolError::UnknownSyncMessageType(other)),
        })
    }
}
