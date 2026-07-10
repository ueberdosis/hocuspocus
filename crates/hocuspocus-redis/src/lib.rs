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

use std::collections::HashMap;
use std::sync::Mutex as StdMutex;

use bytes::Bytes;
use redis::AsyncTypedCommands;
use tokio::sync::mpsc;

use hocuspocus_core::{DocHandle, DocMessage, Origin, Scaler};
use hocuspocus_protocol::{redis as redis_frame, Frame, MessageType, Reader};

/// Lua compare-and-delete: release the lock only if we still own it, so a
/// crashed peer degrades to TTL expiry — identical to the Node Redlock use.
const RELEASE_LOCK_SCRIPT: &str = r#"if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end"#;

/// Redis pub/sub scaling, wire-compatible with `@hocuspocus/extension-redis`.
pub struct RedisScaling {
    config: RedisConfiguration,
    identifier: String,
    publish: redis::aio::MultiplexedConnection,
    /// One pub/sub connection driven by a background task; channel → doc
    /// mailbox routing table shared with it.
    subscribe: redis::aio::MultiplexedConnection,
    docs: std::sync::Arc<StdMutex<HashMap<String, DocHandle>>>,
}

impl RedisScaling {
    pub async fn connect(config: RedisConfiguration) -> Result<Self, hocuspocus_core::BoxError> {
        let identifier = config
            .identifier
            .clone()
            .unwrap_or_else(|| format!("host-{}", uuid::Uuid::new_v4()));

        let client = redis::Client::open(config.url.as_str())?;
        let publish = client.get_multiplexed_async_connection().await?;

        // RESP3 connection with a push channel for pub/sub messages.
        let (push_tx, mut push_rx) = mpsc::unbounded_channel();
        let subscribe_config = redis::AsyncConnectionConfig::new().set_push_sender(push_tx);
        let subscribe_client = redis::Client::open(format!("{}?protocol=resp3", config.url))?;
        let subscribe = subscribe_client
            .get_multiplexed_async_connection_with_config(&subscribe_config)
            .await?;

        let docs: std::sync::Arc<StdMutex<HashMap<String, DocHandle>>> = Default::default();

        let routing = docs.clone();
        let own_identifier = identifier.clone();
        tokio::spawn(async move {
            while let Some(push) = push_rx.recv().await {
                if push.kind != redis::PushKind::Message {
                    continue;
                }
                // data = [channel, payload]
                let mut values = push.data.into_iter();
                let (Some(channel), Some(payload)) = (values.next(), values.next()) else {
                    continue;
                };
                use redis::FromRedisValue;
                let (Ok(channel), Ok(payload)) = (
                    String::from_redis_value(channel),
                    Vec::<u8>::from_redis_value(payload),
                ) else {
                    continue;
                };
                let Some(mailbox) = routing
                    .lock()
                    .expect("routing poisoned")
                    .get(&channel)
                    .cloned()
                else {
                    continue;
                };
                route_frame(&own_identifier, Bytes::from(payload), &mailbox).await;
            }
        });

        Ok(Self {
            config,
            identifier,
            publish,
            subscribe,
            docs,
        })
    }

    fn channel(&self, document_name: &str) -> String {
        redis_frame::channel_key(&self.config.prefix, document_name)
    }
}

/// Decodes an identifier-framed pub/sub payload and routes the embedded
/// wire message into the document actor — the Rust counterpart of the Node
/// extension's `handleIncomingMessage` + `MessageReceiver.apply`.
async fn route_frame(own_identifier: &str, payload: Bytes, mailbox: &DocHandle) {
    let Ok(frame) = redis_frame::decode(payload) else {
        return;
    };
    if frame.identifier == own_identifier {
        return; // our own echo
    }
    let Ok(Frame::Message(envelope)) = Frame::decode(frame.message) else {
        return;
    };
    let message = match envelope.kind {
        MessageType::Sync | MessageType::SyncReply => Some(DocMessage::ApplySync {
            conn_id: None,
            origin: Origin::Redis,
            payload: envelope.payload,
            is_reply: envelope.kind == MessageType::SyncReply,
        }),
        MessageType::Awareness => {
            let mut reader = Reader::new(envelope.payload);
            reader
                .read_var_bytes()
                .ok()
                .map(|update| DocMessage::ApplyAwareness {
                    conn_id: None,
                    origin: Origin::Redis,
                    update,
                })
        }
        MessageType::QueryAwareness => Some(DocMessage::QueryAwareness { conn_id: None }),
        MessageType::BroadcastStateless => {
            let mut reader = Reader::new(envelope.payload);
            reader
                .read_var_string()
                .ok()
                .map(|payload| DocMessage::BroadcastStateless {
                    payload,
                    exclude: None,
                })
        }
        _ => None,
    };
    if let Some(message) = message {
        let _ = mailbox.send(message).await;
    }
}

#[async_trait::async_trait]
impl Scaler for RedisScaling {
    async fn attach(&self, document_name: &str, mailbox: DocHandle) {
        let channel = self.channel(document_name);
        self.docs
            .lock()
            .expect("routing poisoned")
            .insert(channel.clone(), mailbox.clone());
        let mut subscribe = self.subscribe.clone();
        if let Err(error) = subscribe.subscribe(&channel).await {
            tracing::error!(%error, %channel, "redis subscribe failed");
            return;
        }

        // Per-document publish forwarder: the actor sends raw wire frames,
        // we add the identifier framing and publish.
        let (relay_tx, mut relay_rx) = mpsc::channel::<Bytes>(256);
        let mut publish = self.publish.clone();
        let identifier = self.identifier.clone();
        let publish_channel = channel.clone();
        tokio::spawn(async move {
            while let Some(frame) = relay_rx.recv().await {
                let Ok(encoded) = redis_frame::encode(&identifier, &frame) else {
                    continue;
                };
                if let Err(error) = publish.publish(&publish_channel, encoded.as_ref()).await {
                    tracing::warn!(%error, "redis publish failed");
                }
            }
        });
        let _ = mailbox
            .send(DocMessage::SetRelay { outbound: relay_tx })
            .await;
    }

    async fn detach(&self, document_name: &str) {
        let channel = self.channel(document_name);
        self.docs.lock().expect("routing poisoned").remove(&channel);
        let mut subscribe = self.subscribe.clone();
        if let Err(error) = subscribe.unsubscribe(&channel).await {
            tracing::warn!(%error, %channel, "redis unsubscribe failed");
        }
    }

    async fn acquire_store_lock(&self, document_name: &str) -> bool {
        let key = redis_frame::lock_key(&self.config.prefix, document_name);
        let mut conn = self.publish.clone();
        let options = redis::SetOptions::default()
            .conditional_set(redis::ExistenceCheck::NX)
            .with_expiration(redis::SetExpiry::PX(
                self.config.lock_timeout.as_millis() as u64
            ));
        matches!(
            conn.set_options(&key, self.identifier.as_str(), options)
                .await,
            Ok(Some(_))
        )
    }

    async fn release_store_lock(&self, document_name: &str) {
        let key = redis_frame::lock_key(&self.config.prefix, document_name);
        let mut conn = self.publish.clone();
        let result: Result<i64, _> = redis::Script::new(RELEASE_LOCK_SCRIPT)
            .key(&key)
            .arg(self.identifier.as_str())
            .invoke_async(&mut conn)
            .await;
        if let Err(error) = result {
            tracing::warn!(%error, "redis lock release failed");
        }
    }
}
