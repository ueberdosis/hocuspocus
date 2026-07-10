//! Document actor types — the M0 skeleton of the concurrency model.
//!
//! One tokio task per loaded document exclusively owns the `yrs::Doc` and
//! its awareness state; every mutation flows through the actor's mailbox.
//! This preserves the per-document serialization that Node's single thread
//! guarantees implicitly today, while different documents run on different
//! cores. See `crates/RFC.md` § Concurrency model.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use bytes::Bytes;
use futures::future::{BoxFuture, Shared};
use tokio::sync::{mpsc, oneshot};

use crate::context::Context;
use crate::BoxError;

/// Where a document change originated. Mirrors the TS `TransactionOrigin`
/// discriminated union; `Redis`-originated changes never schedule store
/// hooks (the publishing instance persists), and `Local` may opt out.
#[derive(Debug, Clone)]
pub enum Origin {
    /// Applied from a client connection.
    Connection { socket_id: String },
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

/// Identifies one (socket, document) subscription.
pub type ConnId = u64;

/// Messages processed by a document actor. (M0: type surface only — the
/// actor loop lands in M2.)
pub enum DocMessage {
    /// A connection joins the document; the actor replies with the initial
    /// sync (SyncStep2 + own SyncStep1) through the subscriber's sender.
    Join {
        conn_id: ConnId,
        outbound: mpsc::Sender<Bytes>,
        /// Raw routing key the connection used; replies echo it verbatim.
        raw_address: Arc<str>,
        context: Arc<Context>,
        reply: oneshot::Sender<Result<(), BoxError>>,
    },
    Leave {
        conn_id: ConnId,
    },
    /// Apply a y-protocols sync payload (step1/step2/update).
    ApplySync {
        conn_id: Option<ConnId>,
        origin: Origin,
        payload: Bytes,
    },
    /// Apply an awareness update and broadcast it.
    ApplyAwareness {
        conn_id: Option<ConnId>,
        origin: Origin,
        update: Bytes,
    },
    /// Reply with the full awareness state.
    QueryAwareness {
        conn_id: ConnId,
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
    /// (`DirectConnection.transact`).
    DirectTransact {
        origin: Origin,
        transact: Box<dyn FnOnce(&mut yrs::Doc) + Send>,
        done: oneshot::Sender<()>,
    },
    /// Encode the current document state (optionally as a diff against a
    /// state vector).
    EncodeStateAsUpdate {
        state_vector: Option<Bytes>,
        reply: oneshot::Sender<Bytes>,
    },
    /// Execute a pending debounced store immediately (TS
    /// `debouncer.executeNow`; used on last-disconnect and shutdown).
    FlushStoreNow {
        reply: oneshot::Sender<Result<(), BoxError>>,
    },
    /// Terminate the actor after a final store.
    Shutdown,
}

/// Cheap cloneable handle to a document actor.
#[derive(Clone)]
pub struct DocHandle {
    pub name: Arc<str>,
    pub mailbox: mpsc::Sender<DocMessage>,
    /// Serializes overlapping store executions (TS `saveMutex`); the final
    /// unload flush contends on the same lock.
    pub save_lock: Arc<tokio::sync::Mutex<()>>,
}

/// A document slot in the registry. Reproduces the TS `loadingDocuments` /
/// `unloadingDocuments` maps: concurrent loads await the same shared
/// future, and a load requested during unload waits for the unload to
/// finish before starting fresh (the reconnect-during-teardown race).
#[derive(Clone)]
pub enum DocSlot {
    Loading(Shared<BoxFuture<'static, Result<DocHandle, Arc<BoxError>>>>),
    Ready(DocHandle),
    Unloading(Shared<BoxFuture<'static, ()>>),
}

/// Registry of loaded documents.
///
/// The inner mutex is a `std::sync::Mutex` and is never held across an
/// `.await` — slots store shared futures precisely so waiting happens
/// outside the lock.
#[derive(Default)]
pub struct DocRegistry {
    slots: Mutex<HashMap<Arc<str>, DocSlot>>,
}

impl DocRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns the current slot for a document, if any.
    pub fn get(&self, name: &str) -> Option<DocSlot> {
        self.slots
            .lock()
            .expect("registry poisoned")
            .get(name)
            .cloned()
    }

    /// Number of documents in any state.
    pub fn len(&self) -> usize {
        self.slots.lock().expect("registry poisoned").len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Inserts or replaces a slot. (M0: the full `get_or_load` state
    /// machine — Loading dedupe, Unloading-then-retry — lands in M2.)
    pub fn insert(&self, name: Arc<str>, slot: DocSlot) {
        self.slots
            .lock()
            .expect("registry poisoned")
            .insert(name, slot);
    }

    pub fn remove(&self, name: &str) {
        self.slots.lock().expect("registry poisoned").remove(name);
    }
}
