//! Wire protocol for the Hocuspocus collaboration server.
//!
//! This crate is intentionally free of I/O and async code so it can be
//! fuzzed, tested against golden vectors recorded from the TypeScript
//! implementation, and reused by the Redis extension (whose pub/sub frames
//! embed the same wire messages).
//!
//! Every Hocuspocus frame is encoded with lib0-compatible primitives:
//!
//! ```text
//! [varString address][varUint message type][payload…]
//! ```
//!
//! The two exceptions are connection-level `Ping`/`Pong`, which are bare
//! single-byte frames without an address.

pub mod address;
pub mod auth;
pub mod awareness;
pub mod close;
pub mod frame;
pub mod redis;
pub mod sync;
pub mod types;
pub mod varint;

pub use address::DocumentAddress;
pub use auth::{AuthInbound, AuthOutbound, Scope};
pub use awareness::{AwarenessEntry, AwarenessUpdate};
pub use frame::{Envelope, Frame, MessageBuilder};
pub use sync::SyncMessage;
pub use types::{AuthMessageType, MessageType, SyncMessageType};
pub use varint::{Reader, Writer};

/// Errors raised while decoding or encoding wire frames.
#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ProtocolError {
    #[error("unexpected end of buffer")]
    UnexpectedEof,
    #[error("var-uint exceeds 64 bits")]
    VarIntOverflow,
    #[error("invalid utf-8 in var-string")]
    InvalidUtf8,
    #[error("unknown message type {0}")]
    UnknownMessageType(u64),
    #[error("unknown auth message type {0}")]
    UnknownAuthMessageType(u64),
    #[error("unknown sync message type {0}")]
    UnknownSyncMessageType(u64),
    #[error("unknown scope {0:?}")]
    UnknownScope(String),
    #[error("empty frame")]
    EmptyFrame,
    #[error("redis identifier must be 1..=255 bytes, got {0}")]
    InvalidRedisIdentifier(usize),
}
