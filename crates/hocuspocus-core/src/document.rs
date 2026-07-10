//! Document actor message types. The actor itself lives in `actor.rs`;
//! see `crates/RFC.md` § Concurrency model.

use std::sync::Arc;

use bytes::Bytes;
use tokio::sync::{mpsc, oneshot};

use crate::socket::Outbound;
use crate::BoxError;

/// Where a document change originated. Mirrors the TS `TransactionOrigin`
/// discriminated union; `Redis`-originated changes never schedule store
/// hooks (the publishing instance persists), and `Local` may opt out.
#[derive(Debug, Clone)]
pub enum Origin {
    /// Applied from a client connection.
    Connection { conn_id: ConnId },
    /// Relayed from another instance via Redis pub/sub.
    Redis,
    /// A server-side direct connection (`DirectConnection.transact`).
    Local { skip_store_hooks: bool },
}

impl Origin {
    /// TS `shouldSkipStoreHooks`.
    pub fn skips_store_hooks(&self) -> bool {
        match self {
            Self::Connection { .. } => false,
            Self::Redis => true,
            Self::Local { skip_store_hooks } => *skip_store_hooks,
        }
    }
}

/// Identifies one socket connection.
pub type ConnId = u64;

/// Cheap cloneable handle to a document actor's mailbox.
pub type DocHandle = mpsc::Sender<DocMessage>;

/// Messages processed by a document actor.
pub enum DocMessage {
    /// A connection joins the document. The actor pushes the current
    /// awareness state; the initial document sync is client-driven
    /// (SyncStep1).
    Join {
        conn_id: ConnId,
        outbound: mpsc::Sender<Outbound>,
        /// Raw routing key the connection used; replies echo it verbatim.
        raw_address: Arc<str>,
        read_only: bool,
        reply: oneshot::Sender<Result<(), BoxError>>,
    },
    Leave {
        conn_id: ConnId,
    },
    /// Apply a y-protocols sync payload (step1/step2/update).
    /// `is_reply` = the inbound envelope was `SyncReply` (type 4), which
    /// suppresses the reciprocal server SyncStep1.
    ApplySync {
        conn_id: Option<ConnId>,
        origin: Origin,
        payload: Bytes,
        is_reply: bool,
    },
    /// Apply an awareness update (the inner bytes, after the envelope's
    /// varUint8Array) and broadcast the changes.
    ApplyAwareness {
        conn_id: Option<ConnId>,
        origin: Origin,
        update: Bytes,
    },
    /// Reply with the full awareness state. `None` = requested by a peer
    /// instance via the relay.
    QueryAwareness {
        conn_id: Option<ConnId>,
    },
    /// Attach the pub/sub relay: raw wire frames sent to this channel are
    /// published to the document's Redis channel. The actor answers by
    /// publishing its first sync step and querying peer awareness.
    SetRelay {
        outbound: mpsc::Sender<Bytes>,
    },
    /// Deliver a stateless payload to `on_stateless` hooks.
    Stateless {
        conn_id: ConnId,
        payload: String,
    },
    /// Fan a stateless payload out to all local subscribers.
    BroadcastStateless {
        payload: String,
        exclude: Option<ConnId>,
    },
    /// Run a closure inside the actor with exclusive document access
    /// (`DirectConnection.transact`). The produced update is broadcast.
    DirectTransact {
        origin: Origin,
        transact: Box<dyn FnOnce(&mut yrs::TransactionMut) + Send>,
        done: oneshot::Sender<()>,
    },
    /// Encode the current document state (optionally as a diff against an
    /// encoded state vector).
    EncodeStateAsUpdate {
        state_vector: Option<Bytes>,
        reply: oneshot::Sender<Bytes>,
    },
    /// Execute a pending debounced store immediately (TS
    /// `debouncer.executeNow`; used on shutdown).
    FlushStoreNow {
        reply: oneshot::Sender<Result<(), BoxError>>,
    },
    /// Terminate the actor after a final store.
    Shutdown,
}

/// Document name portion of a raw routing key.
pub fn document_name_of(raw_address: &str) -> String {
    raw_address
        .split('\0')
        .next()
        .unwrap_or(raw_address)
        .to_owned()
}
