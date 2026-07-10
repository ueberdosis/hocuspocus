//! Redis horizontal-scaling extension.
//!
//! Interoperates byte-for-byte with `@hocuspocus/extension-redis`, so Node
//! and Rust instances can serve the same documents from one Redis during
//! migration: per-document pub/sub channels (`{prefix}:{documentName}`),
//! identifier-prefixed frames with self-echo filtering, a try-once
//! Redis lock around `on_store_document` (`{prefix}:{documentName}:lock`),
//! and the SyncStep1 + QueryAwareness bootstrap on document load.
//!
//! The frame and key codecs live in [`hocuspocus_protocol::redis`] so they
//! can be fuzzed and golden-tested without a Redis client.
//!
//! # Status
//!
//! M0 scaffold — configuration surface only; the client, the relay and the
//! lock land in M4 (see `crates/RFC.md` § Redis).

use std::time::Duration;

/// Configuration mirroring the Node extension's options.
#[derive(Debug, Clone)]
pub struct RedisConfiguration {
    /// Redis connection URL (`redis://…`).
    pub url: String,
    /// Key/channel prefix. Default `hocuspocus`, like Node.
    pub prefix: String,
    /// Unique instance identifier used for self-echo filtering. Must be
    /// 1..=255 UTF-8 bytes (single length byte on the wire). Default:
    /// `host-{uuid}`, like Node.
    pub identifier: Option<String>,
    /// TTL of the store lock. Default 1s, like Node's `lockTimeout`.
    pub lock_timeout: Duration,
    /// Delay before unloading a document after the last local disconnect,
    /// giving in-flight pub/sub messages time to settle. Default 1s, like
    /// Node's `disconnectDelay`.
    pub disconnect_delay: Duration,
}

impl RedisConfiguration {
    pub fn new(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            prefix: "hocuspocus".into(),
            identifier: None,
            lock_timeout: Duration::from_millis(1_000),
            disconnect_delay: Duration::from_millis(1_000),
        }
    }
}

/// Hook priority of the Redis extension — runs before persistence
/// extensions, exactly like the Node extension's `priority = 1000`.
pub const REDIS_EXTENSION_PRIORITY: i32 = 1000;
