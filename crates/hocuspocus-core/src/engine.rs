//! The engine facade: owns the document registry and socket bookkeeping.
//! Transport-agnostic — a transport (e.g. `hocuspocus-axum`) calls
//! [`Engine::connect`] per WebSocket and pumps bytes both ways.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex as StdMutex, Weak};

use bytes::Bytes;
use tokio::sync::{mpsc, oneshot};

use crate::actor;
use crate::auth::{AuthDecision, AuthRequest, Authenticator};
use crate::config::Configuration;
use crate::document::{ConnId, DocHandle, DocMessage};
use crate::socket::{Outbound, SocketTask};
use crate::storage::Storage;
use crate::BoxError;

/// Accepts every connection with read-write scope — the default when no
/// authenticator is configured, matching a TS server without an
/// `onAuthenticate` hook.
pub struct AllowAll;

#[async_trait::async_trait]
impl Authenticator for AllowAll {
    async fn authenticate(&self, _request: AuthRequest<'_>) -> Result<AuthDecision, BoxError> {
        Ok(AuthDecision {
            scope: hocuspocus_protocol::Scope::ReadWrite,
            context: Default::default(),
        })
    }
}

pub(crate) struct EngineInner {
    pub(crate) config: Configuration,
    pub(crate) storage: Option<Arc<dyn Storage>>,
    pub(crate) authenticator: Arc<dyn Authenticator>,
    pub(crate) events: Arc<dyn crate::auth::EventHooks>,
    pub(crate) scaler: Option<Arc<dyn crate::auth::Scaler>>,
    docs: tokio::sync::Mutex<HashMap<Arc<str>, DocHandle>>,
    sockets: StdMutex<HashMap<ConnId, mpsc::Sender<Outbound>>>,
    next_conn_id: AtomicU64,
    /// Established document connections across all documents — the TS
    /// `getConnectionsCount()` semantic (a socket with a failed auth holds
    /// no document connection and counts zero).
    pub(crate) doc_connections: Arc<std::sync::atomic::AtomicUsize>,
    weak_self: StdMutex<Weak<EngineInner>>,
}

/// Channel pair the transport pumps for one WebSocket.
pub struct SocketChannels {
    pub conn_id: ConnId,
    /// Transport → engine: raw binary frames.
    pub inbound: mpsc::Sender<Bytes>,
    /// Engine → transport: frames to write and the close command.
    pub outbound: mpsc::Receiver<Outbound>,
}

#[derive(Clone)]
pub struct Engine {
    inner: Arc<EngineInner>,
}

impl Engine {
    pub fn new(config: Configuration) -> Self {
        Self::with_parts(
            config,
            None,
            Arc::new(AllowAll),
            Arc::new(crate::auth::NoEvents),
            None,
        )
    }

    pub fn with_parts(
        config: Configuration,
        storage: Option<Arc<dyn Storage>>,
        authenticator: Arc<dyn Authenticator>,
        events: Arc<dyn crate::auth::EventHooks>,
        scaler: Option<Arc<dyn crate::auth::Scaler>>,
    ) -> Self {
        let inner = Arc::new(EngineInner {
            config,
            storage,
            authenticator,
            events,
            scaler,
            docs: tokio::sync::Mutex::new(HashMap::new()),
            sockets: StdMutex::new(HashMap::new()),
            next_conn_id: AtomicU64::new(1),
            doc_connections: Arc::new(std::sync::atomic::AtomicUsize::new(0)),
            weak_self: StdMutex::new(Weak::new()),
        });
        *inner.weak_self.lock().expect("weak_self poisoned") = Arc::downgrade(&inner);
        Self { inner }
    }

    /// Registers a new socket. The transport feeds inbound binary frames
    /// into `inbound` and writes everything from `outbound` to the wire,
    /// honoring [`Outbound::Close`]. Dropping `inbound` tears the
    /// connection down.
    pub fn connect(&self) -> SocketChannels {
        let conn_id = self.inner.next_conn_id.fetch_add(1, Ordering::Relaxed);
        let (inbound_tx, inbound_rx) = mpsc::channel::<Bytes>(256);
        let (outbound_tx, outbound_rx) = mpsc::channel::<Outbound>(1024);
        self.inner
            .sockets
            .lock()
            .expect("sockets poisoned")
            .insert(conn_id, outbound_tx.clone());
        SocketTask::spawn(self.inner.clone(), conn_id, inbound_rx, outbound_tx);
        SocketChannels {
            conn_id,
            inbound: inbound_tx,
            outbound: outbound_rx,
        }
    }

    /// Established document connections (TS `getConnectionsCount()`).
    pub fn connections_count(&self) -> usize {
        self.inner
            .doc_connections
            .load(std::sync::atomic::Ordering::Relaxed)
    }

    /// Currently open sockets (any auth state).
    pub fn sockets_count(&self) -> usize {
        self.inner.sockets.lock().expect("sockets poisoned").len()
    }

    /// Currently loaded documents.
    pub async fn documents_count(&self) -> usize {
        self.inner.docs.lock().await.len()
    }

    /// Closes every open socket (control API / graceful shutdown).
    pub async fn close_all_connections(&self, code: u16, reason: &'static str) {
        let senders: Vec<_> = {
            let sockets = self.inner.sockets.lock().expect("sockets poisoned");
            sockets.values().cloned().collect()
        };
        for sender in senders {
            let _ = sender.send(Outbound::Close { code, reason }).await;
        }
    }

    /// Broadcasts a stateless payload to every client of a loaded document
    /// (and, with scaling attached, to peer instances). No-op for unloaded
    /// documents — matching `documents.get(name)?.broadcastStateless(...)`.
    pub async fn broadcast_stateless(&self, document_name: &str, payload: String) {
        let handle = { self.inner.docs.lock().await.get(document_name).cloned() };
        if let Some(handle) = handle {
            let _ = handle
                .send(DocMessage::BroadcastStateless {
                    payload,
                    exclude: None,
                    from_relay: false,
                })
                .await;
        }
    }

    /// Flushes pending stores on every loaded document (graceful shutdown).
    pub async fn flush_all_documents(&self) {
        let docs: Vec<_> = {
            let docs = self.inner.docs.lock().await;
            docs.values().cloned().collect()
        };
        for doc in docs {
            let (tx, rx) = oneshot::channel();
            if doc
                .send(DocMessage::FlushStoreNow { reply: tx })
                .await
                .is_ok()
            {
                let _ = rx.await;
            }
        }
    }
}

impl EngineInner {
    /// Returns the actor mailbox for a document, loading it if necessary.
    ///
    /// Loads are serialized by the registry lock — acceptable while loads
    /// are cheap; the shared-future `DocSlot` design from the RFC replaces
    /// this when storage backends get slow (M3).
    pub(crate) async fn get_or_load(
        &self,
        name: Arc<str>,
        load_context: Arc<crate::storage::ContextData>,
    ) -> Result<DocHandle, BoxError> {
        let mut docs = self.docs.lock().await;
        if let Some(handle) = docs.get(&name) {
            if !handle.is_closed() {
                return Ok(handle.clone());
            }
            docs.remove(&name);
        }
        let weak = self.weak_self.lock().expect("weak_self poisoned").clone();
        let unload_name = name.clone();
        let on_unload: Box<dyn FnOnce(&str) + Send> = Box::new(move |_| {
            if let Some(inner) = weak.upgrade() {
                tokio::spawn(async move {
                    if let Some(scaler) = &inner.scaler {
                        scaler.detach(&unload_name).await;
                    }
                    let mut docs = inner.docs.lock().await;
                    if docs
                        .get(&unload_name)
                        .is_some_and(|handle| handle.is_closed())
                    {
                        docs.remove(&unload_name);
                    }
                });
            }
        });
        let handle = actor::spawn(
            name.clone(),
            self.config.clone(),
            self.storage.clone(),
            self.events.clone(),
            self.scaler.clone(),
            self.doc_connections.clone(),
            load_context,
            on_unload,
        )
        .await?;
        docs.insert(name.clone(), handle.clone());
        if let Some(scaler) = &self.scaler {
            scaler.attach(&name, handle.clone()).await;
        }
        Ok(handle)
    }

    /// Drops a stale registry entry (used when a join raced an unload).
    pub(crate) async fn forget_doc(&self, name: &str) {
        let mut docs = self.docs.lock().await;
        if docs.get(name).is_some_and(|handle| handle.is_closed()) {
            docs.remove(name);
        }
    }

    pub(crate) fn forget_socket(&self, conn_id: ConnId) {
        self.sockets
            .lock()
            .expect("sockets poisoned")
            .remove(&conn_id);
    }
}
