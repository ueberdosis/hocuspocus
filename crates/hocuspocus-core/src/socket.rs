//! Per-socket connection handling: frame routing, the pre-auth state
//! machine with bounded queues (GHSA-xwhh-v746-pj9m), timeouts, and
//! per-document multiplexing. The Rust equivalent of
//! `packages/server/src/ClientConnection.ts`.
//!
//! Authentication runs **concurrently per document** (spawned tasks), like
//! the TS async hook chain: a slow or never-resolving authenticator must
//! not stall the frame loop, and in-flight authentications count toward
//! the pending-document limit.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

use bytes::Bytes;
use tokio::sync::{mpsc, oneshot};

use crate::auth::{AuthDecision, AuthRequest};
use crate::document::{ConnId, DocHandle, DocMessage, Origin};
use crate::engine::EngineInner;
use hocuspocus_protocol::{
    close, AuthInbound, AuthOutbound, Envelope, Frame, MessageBuilder, MessageType, Reader,
};

/// What the engine hands to the transport for writing.
#[derive(Debug)]
pub enum Outbound {
    /// A binary WebSocket frame.
    Frame(Bytes),
    /// Close the socket with this code/reason (after flushing).
    Close { code: u16, reason: &'static str },
}

/// Per-document state on one socket.
enum DocState {
    /// Frames queued; no Auth frame seen yet.
    Pending { queue: Vec<Bytes>, bytes: usize },
    /// Auth frame received; the auth task is running. Queued frames are
    /// drained on success. Counts toward the pending-document limit.
    Authenticating { queue: Vec<Bytes>, bytes: usize },
    /// Authenticated and joined to a document actor.
    Active {
        doc: DocHandle,
        read_only: bool,
        context: Arc<crate::storage::ContextData>,
    },
}

/// Result of a spawned per-document auth task.
struct AuthOutcome {
    raw_address: Arc<str>,
    document_name: Arc<str>,
    result: Result<AuthDecision, String>,
}

pub(crate) struct SocketTask {
    engine: Arc<EngineInner>,
    conn_id: ConnId,
    outbound: mpsc::Sender<Outbound>,
    docs: HashMap<Arc<str>, DocState>,
    /// Total queued pre-auth bytes across all documents on this socket.
    queued_bytes: usize,
    queued_messages: usize,
    authenticated_any: bool,
    opened_at: Instant,
    last_inbound: Instant,
    auth_tx: mpsc::Sender<AuthOutcome>,
}

impl SocketTask {
    pub(crate) fn spawn(
        engine: Arc<EngineInner>,
        conn_id: ConnId,
        inbound: mpsc::Receiver<Bytes>,
        outbound: mpsc::Sender<Outbound>,
    ) {
        let (auth_tx, auth_rx) = mpsc::channel::<AuthOutcome>(64);
        let task = Self {
            engine,
            conn_id,
            outbound,
            docs: HashMap::new(),
            queued_bytes: 0,
            queued_messages: 0,
            authenticated_any: false,
            opened_at: Instant::now(),
            last_inbound: Instant::now(),
            auth_tx,
        };
        tokio::spawn(task.run(inbound, auth_rx));
    }

    async fn run(
        mut self,
        mut inbound: mpsc::Receiver<Bytes>,
        mut auth_rx: mpsc::Receiver<AuthOutcome>,
    ) {
        loop {
            let deadline = self.timeout_deadline();
            let flow = tokio::select! {
                frame = inbound.recv() => {
                    let Some(frame) = frame else {
                        // Transport closed the socket.
                        break;
                    };
                    self.last_inbound = Instant::now();
                    self.handle_frame(frame).await
                }
                outcome = auth_rx.recv() => {
                    let Some(outcome) = outcome else { break };
                    self.finish_auth(outcome).await
                }
                _ = tokio::time::sleep_until(tokio::time::Instant::from_std(deadline)) => {
                    // Idle / pre-auth timeout: TS closes with 4408.
                    let _ = self.outbound.send(Outbound::Close {
                        code: close::CONNECTION_TIMEOUT.code,
                        reason: close::CONNECTION_TIMEOUT.reason,
                    }).await;
                    break;
                }
            };
            if flow.is_break() {
                break;
            }
        }
        self.teardown().await;
    }

    /// The pre-auth deadline is absolute from socket open — inbound frames
    /// must NOT refresh it (an unauthenticated flood cannot keep a socket
    /// alive). Once any document authenticated, it becomes an idle timeout
    /// refreshed by any inbound frame.
    fn timeout_deadline(&self) -> Instant {
        if self.authenticated_any {
            self.last_inbound + self.engine.config.timeout
        } else {
            self.opened_at + self.engine.config.timeout
        }
    }

    async fn handle_frame(&mut self, raw: Bytes) -> std::ops::ControlFlow<()> {
        use std::ops::ControlFlow;

        let frame = match Frame::decode(raw.clone()) {
            Ok(frame) => frame,
            Err(error) => {
                tracing::debug!(conn = self.conn_id, %error, "undecodable frame");
                return ControlFlow::Continue(());
            }
        };
        match frame {
            Frame::Ping => {
                let _ = self
                    .outbound
                    .send(Outbound::Frame(MessageBuilder::bare(MessageType::Pong)))
                    .await;
                ControlFlow::Continue(())
            }
            Frame::Pong => ControlFlow::Continue(()),
            Frame::Message(envelope) => self.handle_envelope(envelope, raw).await,
        }
    }

    async fn handle_envelope(
        &mut self,
        envelope: Envelope,
        raw: Bytes,
    ) -> std::ops::ControlFlow<()> {
        use std::ops::ControlFlow;

        {
            let stats = &self.engine.stats;
            crate::stats::EngineStats::incr(match envelope.kind {
                MessageType::Sync | MessageType::SyncReply | MessageType::SyncStatus => {
                    &stats.received_sync
                }
                MessageType::Awareness | MessageType::QueryAwareness => &stats.received_awareness,
                MessageType::Stateless | MessageType::BroadcastStateless => {
                    &stats.received_stateless
                }
                MessageType::Auth => &stats.received_auth,
                _ => &stats.received_other,
            });
        }

        let raw_address = envelope.address.raw.clone();
        match self.docs.get_mut(&raw_address) {
            Some(DocState::Active { doc, read_only, .. }) => {
                let doc = doc.clone();
                let read_only = *read_only;
                self.route_active(&doc, read_only, envelope).await;
                ControlFlow::Continue(())
            }
            Some(DocState::Authenticating { .. }) => self.queue_frame(raw_address, raw).await,
            _ if envelope.kind == MessageType::Auth => self.start_auth(envelope).await,
            _ => self.queue_frame(raw_address, raw).await,
        }
    }

    /// Closes the socket over a violated pre-auth limit. TS uses
    /// ResetConnection (4205) so a well-behaved-but-bursty client
    /// reconnects and resyncs.
    async fn close_over_limit(&mut self) -> std::ops::ControlFlow<()> {
        let _ = self
            .outbound
            .send(Outbound::Close {
                code: close::RESET_CONNECTION.code,
                reason: close::RESET_CONNECTION.reason,
            })
            .await;
        std::ops::ControlFlow::Break(())
    }

    /// Queue a frame for a not-yet-authenticated document, enforcing the
    /// exact TS limits.
    async fn queue_frame(
        &mut self,
        raw_address: Arc<str>,
        raw: Bytes,
    ) -> std::ops::ControlFlow<()> {
        use std::ops::ControlFlow;

        let config = &self.engine.config;
        if self.queued_bytes + raw.len() > config.max_unauthenticated_queue_size
            || self.queued_messages + 1 > config.max_unauthenticated_queue_messages
        {
            return self.close_over_limit().await;
        }
        let is_new_doc = !self.docs.contains_key(&raw_address);
        if is_new_doc && self.unauthenticated_doc_count() + 1 > config.max_pending_documents {
            return self.close_over_limit().await;
        }

        self.queued_bytes += raw.len();
        self.queued_messages += 1;
        match self.docs.entry(raw_address).or_insert(DocState::Pending {
            queue: Vec::new(),
            bytes: 0,
        }) {
            DocState::Pending { queue, bytes } | DocState::Authenticating { queue, bytes } => {
                *bytes += raw.len();
                queue.push(raw);
            }
            DocState::Active { .. } => unreachable!("active handled above"),
        }
        ControlFlow::Continue(())
    }

    /// Documents that are not authenticated yet — queued or with an auth
    /// in flight; both count toward the pending-document limit.
    fn unauthenticated_doc_count(&self) -> usize {
        self.docs
            .values()
            .filter(|state| !matches!(state, DocState::Active { .. }))
            .count()
    }

    /// Kicks off the auth flow for one document address on its own task;
    /// the frame loop keeps running (TS behavior — in-flight auths must
    /// not block other documents, and they count toward the pending
    /// limit).
    async fn start_auth(&mut self, envelope: Envelope) -> std::ops::ControlFlow<()> {
        use std::ops::ControlFlow;

        let raw_address = envelope.address.raw.clone();
        let mut reader = Reader::new(envelope.payload);
        let (token, provider_version) = match AuthInbound::decode(&mut reader) {
            Ok(AuthInbound::Token {
                token,
                provider_version,
            }) => (token, provider_version),
            Err(error) => {
                tracing::debug!(conn = self.conn_id, %error, "invalid auth frame");
                return ControlFlow::Continue(());
            }
        };

        // Transition Pending → Authenticating (carrying queued frames) and
        // enforce the pending-document limit for brand-new addresses.
        let previous = self.docs.remove(&raw_address);
        let (queue, bytes) = match previous {
            Some(DocState::Pending { queue, bytes }) => (queue, bytes),
            Some(active @ DocState::Active { .. }) => {
                // Late Auth on an established doc = token re-sync; restore.
                self.docs.insert(raw_address, active);
                return ControlFlow::Continue(());
            }
            Some(other) => {
                self.docs.insert(raw_address, other);
                return ControlFlow::Continue(());
            }
            None => {
                if self.unauthenticated_doc_count() + 1 > self.engine.config.max_pending_documents {
                    return self.close_over_limit().await;
                }
                (Vec::new(), 0)
            }
        };
        self.docs.insert(
            raw_address.clone(),
            DocState::Authenticating { queue, bytes },
        );

        let engine = self.engine.clone();
        let auth_tx = self.auth_tx.clone();
        let document_name = envelope.address.document_name.clone();
        tokio::spawn(async move {
            let request = AuthRequest {
                document_name: &document_name,
                token: &token,
                provider_version: provider_version.as_deref(),
                request_headers: &[],
                remote_addr: None,
            };
            // TS runs onConnect before onAuthenticate; either may reject.
            // Both may contribute context; onAuthenticate's keys win.
            let result = match engine.events.connect(&document_name).await {
                Ok(connect_context) => engine
                    .authenticator
                    .authenticate(request)
                    .await
                    .map(|mut decision| {
                        let mut merged = connect_context;
                        merged.extend(decision.context);
                        decision.context = merged;
                        decision
                    })
                    .map_err(|error| error.to_string()),
                Err(error) => Err(error.to_string()),
            };
            let _ = auth_tx
                .send(AuthOutcome {
                    raw_address,
                    document_name,
                    result,
                })
                .await;
        });
        ControlFlow::Continue(())
    }

    /// Applies a finished auth: deny keeps the socket open with that
    /// document's state reset (TS), grant joins the actor and drains the
    /// queued frames in arrival order.
    async fn finish_auth(&mut self, outcome: AuthOutcome) -> std::ops::ControlFlow<()> {
        use std::ops::ControlFlow;

        let AuthOutcome {
            raw_address,
            document_name,
            result,
        } = outcome;

        let queued = match self.docs.remove(&raw_address) {
            Some(DocState::Authenticating { queue, bytes }) => {
                self.queued_bytes -= bytes;
                self.queued_messages -= queue.len();
                queue
            }
            Some(other) => {
                self.docs.insert(raw_address.clone(), other);
                return ControlFlow::Continue(());
            }
            None => Vec::new(),
        };

        let decision = match result {
            Ok(decision) => decision,
            Err(reason) => {
                crate::stats::EngineStats::incr(&self.engine.stats.auth_denied);
                // TS keeps the socket OPEN after a failed auth: it sends
                // PermissionDenied and clears the per-document state so a
                // retry (provider re-sends a token) starts fresh.
                let reason = if reason.is_empty() {
                    "permission-denied".to_owned()
                } else {
                    reason
                };
                let frame = MessageBuilder::new(&raw_address)
                    .auth(&AuthOutbound::PermissionDenied { reason });
                let _ = self.outbound.send(Outbound::Frame(frame)).await;
                return ControlFlow::Continue(());
            }
        };

        let read_only = matches!(decision.scope, hocuspocus_protocol::Scope::ReadOnly);
        let context = Arc::new(decision.context);
        let frame = MessageBuilder::new(&raw_address).auth(&AuthOutbound::Authenticated {
            scope: decision.scope,
        });
        let _ = self.outbound.send(Outbound::Frame(frame)).await;

        // Join the document actor (loading it if needed). A handle whose
        // actor unloaded concurrently fails the join; retry once against a
        // freshly loaded actor.
        let mut joined: Option<DocHandle> = None;
        for _attempt in 0..2 {
            let doc = match self
                .engine
                .get_or_load(document_name.clone(), context.clone())
                .await
            {
                Ok(doc) => doc,
                Err(error) => {
                    // TS: a failed onLoadDocument sends PermissionDenied and
                    // resets the per-document state; the socket stays open.
                    // Only an explicit `Refused` reason reaches the client
                    // (TS `error.reason ?? 'permission-denied'`).
                    tracing::warn!(conn = self.conn_id, %error, "document load failed");
                    let reason = error
                        .downcast_ref::<crate::Refused>()
                        .map(|refused| refused.reason.clone())
                        .unwrap_or_else(|| "permission-denied".to_owned());
                    let frame = MessageBuilder::new(&raw_address)
                        .auth(&AuthOutbound::PermissionDenied { reason });
                    let _ = self.outbound.send(Outbound::Frame(frame)).await;
                    return ControlFlow::Continue(());
                }
            };
            let (reply_tx, reply_rx) = oneshot::channel();
            let join = DocMessage::Join {
                conn_id: self.conn_id,
                outbound: self.outbound.clone(),
                raw_address: raw_address.clone(),
                read_only,
                context: context.clone(),
                reply: reply_tx,
            };
            if doc.send(join).await.is_ok() && reply_rx.await.is_ok() {
                joined = Some(doc);
                break;
            }
            self.engine.forget_doc(&document_name).await;
        }
        let Some(doc) = joined else {
            tracing::error!(conn = self.conn_id, "join failed after retry");
            return ControlFlow::Break(());
        };

        self.authenticated_any = true;
        self.docs.insert(
            raw_address,
            DocState::Active {
                doc: doc.clone(),
                read_only,
                context,
            },
        );

        // Drain queued frames in arrival order through the active router.
        for raw in queued {
            if let Ok(Frame::Message(envelope)) = Frame::decode(raw) {
                self.route_active(&doc, read_only, envelope).await;
            }
        }
        ControlFlow::Continue(())
    }

    /// Routes a frame for an authenticated document to its actor —
    /// the Rust counterpart of `MessageReceiver.apply`.
    async fn route_active(&self, doc: &DocHandle, _read_only: bool, envelope: Envelope) {
        let origin = Origin::Connection {
            conn_id: self.conn_id,
        };
        let message = match envelope.kind {
            MessageType::Sync | MessageType::SyncReply => Some(DocMessage::ApplySync {
                conn_id: Some(self.conn_id),
                origin,
                payload: envelope.payload,
                is_reply: envelope.kind == MessageType::SyncReply,
            }),
            MessageType::Awareness => {
                let mut reader = Reader::new(envelope.payload);
                match reader.read_var_bytes() {
                    Ok(update) => Some(DocMessage::ApplyAwareness {
                        conn_id: Some(self.conn_id),
                        origin,
                        update,
                    }),
                    Err(error) => {
                        tracing::debug!(conn = self.conn_id, %error, "invalid awareness frame");
                        None
                    }
                }
            }
            MessageType::QueryAwareness => Some(DocMessage::QueryAwareness {
                conn_id: Some(self.conn_id),
            }),
            MessageType::Stateless => {
                let mut reader = Reader::new(envelope.payload);
                match reader.read_var_string() {
                    Ok(payload) => Some(DocMessage::Stateless {
                        conn_id: self.conn_id,
                        payload,
                    }),
                    Err(_) => None,
                }
            }
            MessageType::BroadcastStateless => {
                // Server-internal opcode; never legitimate from a client.
                tracing::warn!(
                    conn = self.conn_id,
                    "client sent BroadcastStateless; dropped"
                );
                None
            }
            MessageType::Close => {
                // Provider closed this document (not the socket): leave the
                // actor and confirm with a CLOSE message (TS
                // Connection.close sends one back).
                let _ = doc
                    .send(DocMessage::Leave {
                        conn_id: self.conn_id,
                    })
                    .await;
                let frame = MessageBuilder::new(&envelope.address.raw).close("provider_initiated");
                let _ = self.outbound.send(Outbound::Frame(frame)).await;
                None
            }
            MessageType::Auth => {
                // Token re-sync on an established connection → on_token_sync
                // hooks (wired later).
                None
            }
            MessageType::Ping | MessageType::Pong | MessageType::SyncStatus => None,
        };
        if let Some(message) = message {
            let _ = doc.send(message).await;
        }
    }

    async fn teardown(mut self) {
        for (address, state) in self.docs.drain() {
            if let DocState::Active { doc, context, .. } = state {
                let events = self.engine.events.clone();
                let document_name = crate::document::document_name_of(&address);
                tokio::spawn(async move { events.disconnect(&document_name, &context).await });
                let _ = doc
                    .send(DocMessage::Leave {
                        conn_id: self.conn_id,
                    })
                    .await;
            }
        }
        self.engine.forget_socket(self.conn_id);
    }
}
