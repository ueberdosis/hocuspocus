//! The embeddable Hocuspocus collaboration engine.
//!
//! Transport-agnostic: consumes framed binary messages (see
//! [`hocuspocus_protocol`]) and never touches HTTP itself. The
//! `hocuspocus-axum` crate provides the default WebSocket transport; the
//! `hocuspocus-server` crate wires everything into a standalone binary.
//!
//! # Status
//!
//! This is the M0 scaffold: the public trait surface (extensions/hooks,
//! storage, authentication), configuration, and the document-actor type
//! skeletons are defined here; the runtime implementation lands in M2 (see
//! `crates/RFC.md`).

mod actor;
pub mod auth;
pub mod awareness;
pub mod config;
pub mod context;
pub mod document;
pub mod engine;
pub mod extension;
pub mod socket;
pub mod stats;
pub mod storage;

pub use auth::{AuthDecision, AuthRequest, Authenticator, EventHooks, NoEvents, Scaler};
pub use config::Configuration;
pub use context::Context;
pub use document::{ConnId, DocHandle, DocMessage, Origin};
pub use engine::{AllowAll, Engine, SocketChannels};
pub use extension::{Extension, HookChain, HookError, HookResult};
pub use socket::Outbound;
pub use stats::{EngineStats, StatsSnapshot};
pub use storage::Storage;

/// Boxed error type used across hook and storage boundaries.
pub type BoxError = Box<dyn std::error::Error + Send + Sync + 'static>;

/// A hook/storage error carrying a client-visible denial reason (the TS
/// `error.reason` contract): the reason is sent verbatim in the
/// `PermissionDenied` auth message. Errors of any other type surface to
/// clients as the generic `"permission-denied"`.
#[derive(Debug)]
pub struct Refused {
    pub reason: String,
}

impl std::fmt::Display for Refused {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.reason)
    }
}

impl std::error::Error for Refused {}
