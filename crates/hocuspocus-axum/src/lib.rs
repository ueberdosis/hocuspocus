//! Axum/WebSocket transport for the Hocuspocus engine.
//!
//! Keeps `hocuspocus-core` free of HTTP concerns, mirroring how
//! `Server.ts` wraps the transport-agnostic `Hocuspocus.ts` engine in
//! TypeScript. Embedders who use a different HTTP stack can skip this crate
//! and feed frames to the engine directly.
//!
//! # Status
//!
//! M0 scaffold — the WebSocket upgrade handler, the per-socket
//! reader/writer tasks, and the pre-auth state machine land in M2 (see
//! `crates/RFC.md` § Connection model).

/// Response body served for plain HTTP requests, matching the TypeScript
/// server's default request handler.
pub const WELCOME_MESSAGE: &str = "Welcome to Hocuspocus!";
