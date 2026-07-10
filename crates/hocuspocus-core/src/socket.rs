//! Per-socket connection handling: frame routing, the pre-auth state
//! machine with bounded queues (GHSA-xwhh-v746-pj9m), timeouts, and
//! per-document multiplexing. The Rust equivalent of
//! `packages/server/src/ClientConnection.ts`.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

use bytes::Bytes;
use tokio::sync::{mpsc, oneshot};

use crate::auth::AuthRequest;
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
    /// Frames queued until the document is authenticated.
    Pending { queue: Vec<Bytes>, bytes: usize },
    /// Authenticated and joined to a document actor.
    Active { doc: DocHandle, read_only: bool },
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
}

impl SocketTask {
    pub(crate) fn spawn(
        engine: Arc<EngineInner>,
        conn_id: ConnId,
        inbound: mpsc::Receiver<Bytes>,
        outbound: mpsc::Sender<Outbound>,
    ) {
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
        };
        tokio::spawn(task.run(inbound));
    }

    async fn run(mut self, mut inbound: mpsc::Receiver<Bytes>) {
        loop {
            let deadline = self.timeout_deadline();
            let frame = tokio::select! {
                frame = inbound.recv() => frame,
                _ = tokio::time::sleep_until(tokio::time::Instant::from_std(deadline)) => {
                    // Idle / pre-auth timeout: TS closes with 4408.
                    let _ = self.outbound.send(Outbound::Close {
                        code: close::CONNECTION_TIMEOUT.code,
                        reason: close::CONNECTION_TIMEOUT.reason,
                    }).await;
                    break;
                }
            };
            let Some(frame) = frame else {
                // Transport closed the socket.
                break;
            };
            self.last_inbound = Instant::now();
            if self.handle_frame(frame).await.is_break() {
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

        let raw_address = envelope.address.raw.clone();
        match self.docs.get_mut(&raw_address) {
            Some(DocState::Active { doc, read_only }) => {
                let doc = doc.clone();
                let read_only = *read_only;
                self.route_active(&doc, read_only, envelope).await;
                ControlFlow::Continue(())
            }
            _ if envelope.kind == MessageType::Auth => self.authenticate(envelope).await,
            _ => self.queue_pending(raw_address, raw).await,
        }
    }

    /// Queue a pre-auth frame, enforcing the exact TS limits.
    async fn queue_pending(
        &mut self,
        raw_address: Arc<str>,
        raw: Bytes,
    ) -> std::ops::ControlFlow<()> {
        use std::ops::ControlFlow;

        let config = &self.engine.config;
        if self.queued_bytes + raw.len() > config.max_unauthenticated_queue_size
            || self.queued_messages + 1 > config.max_unauthenticated_queue_messages
        {
            let _ = self
                .outbound
                .send(Outbound::Close {
                    code: close::MESSAGE_TOO_BIG.code,
                    reason: close::MESSAGE_TOO_BIG.reason,
                })
                .await;
            return ControlFlow::Break(());
        }
        let is_new_doc = !self.docs.contains_key(&raw_address);
        if is_new_doc && self.pending_doc_count() + 1 > config.max_pending_documents {
            let _ = self
                .outbound
                .send(Outbound::Close {
                    code: close::MESSAGE_TOO_BIG.code,
                    reason: close::MESSAGE_TOO_BIG.reason,
                })
                .await;
            return ControlFlow::Break(());
        }

        self.queued_bytes += raw.len();
        self.queued_messages += 1;
        match self.docs.entry(raw_address).or_insert(DocState::Pending {
            queue: Vec::new(),
            bytes: 0,
        }) {
            DocState::Pending { queue, bytes } => {
                *bytes += raw.len();
                queue.push(raw);
            }
            DocState::Active { .. } => unreachable!("active handled above"),
        }
        ControlFlow::Continue(())
    }

    fn pending_doc_count(&self) -> usize {
        self.docs
            .values()
            .filter(|state| matches!(state, DocState::Pending { .. }))
            .count()
    }

    /// Runs the auth flow for one document address, then joins the actor
    /// and drains any queued frames in order.
    async fn authenticate(&mut self, envelope: Envelope) -> std::ops::ControlFlow<()> {
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

        let request = AuthRequest {
            document_name: &envelope.address.document_name,
            token: &token,
            provider_version: provider_version.as_deref(),
            request_headers: &[],
            remote_addr: None,
        };
        let decision = self.engine.authenticator.authenticate(request).await;

        let decision = match decision {
            Ok(decision) => decision,
            Err(error) => {
                // TS: PermissionDenied message, then close 4401.
                let frame =
                    MessageBuilder::new(&raw_address).auth(&AuthOutbound::PermissionDenied {
                        reason: error.to_string(),
                    });
                let _ = self.outbound.send(Outbound::Frame(frame)).await;
                let _ = self
                    .outbound
                    .send(Outbound::Close {
                        code: close::UNAUTHORIZED.code,
                        reason: close::UNAUTHORIZED.reason,
                    })
                    .await;
                return ControlFlow::Break(());
            }
        };

        let read_only = matches!(decision.scope, hocuspocus_protocol::Scope::ReadOnly);
        let frame = MessageBuilder::new(&raw_address).auth(&AuthOutbound::Authenticated {
            scope: decision.scope,
        });
        let _ = self.outbound.send(Outbound::Frame(frame)).await;

        // Join the document actor (loading it if needed). A handle whose
        // actor unloaded concurrently fails the join; retry once against a
        // freshly loaded actor.
        let document_name: Arc<str> = envelope.address.document_name.clone();
        let mut joined: Option<DocHandle> = None;
        for _attempt in 0..2 {
            let doc = match self.engine.get_or_load(document_name.clone()).await {
                Ok(doc) => doc,
                Err(error) => {
                    tracing::error!(conn = self.conn_id, %error, "document load failed");
                    let _ = self
                        .outbound
                        .send(Outbound::Close {
                            code: close::FORBIDDEN.code,
                            reason: close::FORBIDDEN.reason,
                        })
                        .await;
                    return ControlFlow::Break(());
                }
            };
            let (reply_tx, reply_rx) = oneshot::channel();
            let join = DocMessage::Join {
                conn_id: self.conn_id,
                outbound: self.outbound.clone(),
                raw_address: raw_address.clone(),
                read_only,
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

        // Drain queued frames in arrival order through the active router.
        let queued = match self.docs.insert(
            raw_address.clone(),
            DocState::Active {
                doc: doc.clone(),
                read_only,
            },
        ) {
            Some(DocState::Pending { queue, bytes }) => {
                self.queued_bytes -= bytes;
                self.queued_messages -= queue.len();
                queue
            }
            _ => Vec::new(),
        };
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
                conn_id: self.conn_id,
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
                // hooks (wired in M3).
                None
            }
            MessageType::Ping | MessageType::Pong | MessageType::SyncStatus => None,
        };
        if let Some(message) = message {
            let _ = doc.send(message).await;
        }
    }

    async fn teardown(mut self) {
        for (_address, state) in self.docs.drain() {
            if let DocState::Active { doc, .. } = state {
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
