//! The document actor: one tokio task exclusively owning a `yrs::Doc` and
//! its awareness state. See `crates/RFC.md` § Concurrency model.
//!
//! Sync semantics replicate `packages/server/src/MessageReceiver.ts`:
//!
//! - client SyncStep1 → send `[Sync][Step2 diff]`, then (unless the inbound
//!   frame was a SyncReply) `[Sync][Step1 our-sv]`
//! - client SyncStep2/Update → apply, broadcast the produced update to ALL
//!   subscribers (yjs applies duplicates idempotently), ack `SyncStatus(1)`
//! - read-only connections never mutate the document and ack
//!   `SyncStatus(0)` for updates
//!
//! Broadcast replicates `Document.handleUpdate` / `handleAwarenessUpdate`.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

use bytes::Bytes;
use tokio::sync::mpsc;
use yrs::updates::decoder::Decode;
use yrs::updates::encoder::Encode;
use yrs::{ReadTxn, StateVector, Transact, Update};

use crate::awareness::ServerAwareness;
use crate::config::Configuration;
use crate::document::{ConnId, DocMessage};
use crate::socket::Outbound;
use crate::storage::Storage;
use hocuspocus_protocol::{AwarenessUpdate, MessageBuilder, MessageType, Reader, SyncMessage};

/// An update with no structs and no deletions (v1 encoding `[0, 0]`);
/// produced by transactions that changed nothing — never broadcast.
const EMPTY_UPDATE_V1: &[u8] = &[0, 0];

/// One connection's subscription to a document.
struct Subscriber {
    outbound: mpsc::Sender<Outbound>,
    /// Exact routing key the connection used; replies echo it verbatim.
    raw_address: Arc<str>,
    read_only: bool,
    /// Awareness client ids introduced by this connection, removed from the
    /// shared awareness when it leaves (TS `connections` → `clients` set).
    client_ids: std::collections::HashSet<u64>,
}

struct DirtyState {
    dirty_since: Instant,
    last_change: Instant,
}

struct DocumentActor {
    name: Arc<str>,
    doc: yrs::Doc,
    awareness: ServerAwareness,
    subscribers: HashMap<ConnId, Subscriber>,
    dirty: Option<DirtyState>,
    config: Configuration,
    storage: Option<Arc<dyn Storage>>,
    events: Arc<dyn crate::auth::EventHooks>,
}

/// Spawns the actor: loads persisted state, then processes its mailbox.
/// Returns the mailbox sender once the document is fully loaded.
pub(crate) async fn spawn(
    name: Arc<str>,
    config: Configuration,
    storage: Option<Arc<dyn Storage>>,
    events: Arc<dyn crate::auth::EventHooks>,
    on_unload: Box<dyn FnOnce(&str) + Send>,
) -> Result<mpsc::Sender<DocMessage>, crate::BoxError> {
    let doc = yrs::Doc::with_options(yrs::Options {
        skip_gc: !config.gc,
        ..yrs::Options::default()
    });

    // Load persisted state before accepting any traffic (TS onLoadDocument).
    if let Some(storage) = &storage {
        if let Some(state) = storage.fetch(&name).await? {
            let mut txn = doc.transact_mut();
            let update = Update::decode_v1(&state)?;
            txn.apply_update(update)?;
        }
    }

    let (tx, mut rx) = mpsc::channel::<DocMessage>(1024);

    let mut actor = DocumentActor {
        name,
        doc,
        awareness: ServerAwareness::new(),
        subscribers: HashMap::new(),
        dirty: None,
        config,
        storage,
        events,
    };

    tokio::spawn(async move {
        loop {
            let message = match actor.store_deadline() {
                Some(deadline) => {
                    match tokio::time::timeout_at(
                        tokio::time::Instant::from_std(deadline),
                        rx.recv(),
                    )
                    .await
                    {
                        Ok(message) => message,
                        Err(_elapsed) => {
                            actor.store_now().await;
                            continue;
                        }
                    }
                }
                None => rx.recv().await,
            };
            let Some(message) = message else { break };
            if actor.handle(message).await {
                // Unload: flush, deregister, and drop any queued messages.
                // Join replies error out (dropped channel) and the engine
                // retries against a freshly loaded actor.
                actor.store_now().await;
                on_unload(&actor.name);
                rx.close();
                while rx.recv().await.is_some() {}
                break;
            }
        }
    });

    Ok(tx)
}

impl DocumentActor {
    /// Handles one mailbox message; returns `true` when the actor should
    /// unload.
    async fn handle(&mut self, message: DocMessage) -> bool {
        match message {
            DocMessage::Join {
                conn_id,
                outbound,
                raw_address,
                read_only,
                reply,
            } => {
                let subscriber = Subscriber {
                    outbound,
                    raw_address,
                    read_only,
                    client_ids: Default::default(),
                };
                // TS: a new Connection immediately receives the current
                // awareness states, if any.
                let awareness = self.awareness.full_update();
                if !awareness.entries.is_empty() {
                    send_awareness_to(&subscriber, &awareness);
                }
                self.subscribers.insert(conn_id, subscriber);
                let _ = reply.send(Ok(()));
                false
            }
            DocMessage::Leave { conn_id } => {
                if let Some(subscriber) = self.subscribers.remove(&conn_id) {
                    let removal = self.awareness.remove_clients(subscriber.client_ids);
                    self.broadcast_awareness(&removal);
                }
                self.subscribers.is_empty()
            }
            DocMessage::ApplySync {
                conn_id,
                origin: _,
                payload,
                is_reply,
            } => {
                self.apply_sync(conn_id, payload, is_reply);
                false
            }
            DocMessage::ApplyAwareness {
                conn_id, update, ..
            } => {
                self.apply_awareness(conn_id, update);
                false
            }
            DocMessage::QueryAwareness { conn_id } => {
                if let Some(subscriber) = self.subscribers.get(&conn_id) {
                    let full = self.awareness.full_update();
                    send_awareness_to(subscriber, &full);
                }
                false
            }
            DocMessage::BroadcastStateless { payload, exclude } => {
                for (conn_id, subscriber) in &self.subscribers {
                    if Some(*conn_id) == exclude {
                        continue;
                    }
                    let frame = MessageBuilder::new(&subscriber.raw_address).stateless(&payload);
                    let _ = subscriber.outbound.try_send(Outbound::Frame(frame));
                }
                false
            }
            DocMessage::Stateless { payload, .. } => {
                // Delivered to the stateless event hook; TS only invokes
                // the hook chain, there is no automatic relay. Awaited
                // inline to preserve per-document ordering, like the TS
                // sequential message queue.
                self.events.stateless(&self.name, &payload).await;
                false
            }
            DocMessage::DirectTransact { transact, done, .. } => {
                let update = {
                    let mut txn = self.doc.transact_mut();
                    transact(&mut txn);
                    txn.encode_update_v1()
                };
                self.broadcast_update(&update);
                self.mark_dirty();
                let _ = done.send(());
                false
            }
            DocMessage::EncodeStateAsUpdate {
                state_vector,
                reply,
            } => {
                let txn = self.doc.transact();
                let sv = match state_vector {
                    Some(bytes) => StateVector::decode_v1(&bytes).unwrap_or_default(),
                    None => StateVector::default(),
                };
                let _ = reply.send(Bytes::from(txn.encode_state_as_update_v1(&sv)));
                false
            }
            DocMessage::FlushStoreNow { reply } => {
                self.store_now().await;
                let _ = reply.send(Ok(()));
                false
            }
            DocMessage::Shutdown => true,
        }
    }

    fn apply_sync(&mut self, conn_id: Option<ConnId>, payload: Bytes, inbound_was_reply: bool) {
        let mut reader = Reader::new(payload);
        let message = match SyncMessage::decode(&mut reader) {
            Ok(message) => message,
            Err(error) => {
                tracing::warn!(document = %self.name, %error, "invalid sync payload");
                return;
            }
        };

        let is_step2 = matches!(message, SyncMessage::Step2 { .. });
        match message {
            SyncMessage::Step1 { state_vector } => {
                let Some(subscriber) = conn_id.and_then(|id| self.subscribers.get(&id)) else {
                    return;
                };
                let remote_sv = match StateVector::decode_v1(&state_vector) {
                    Ok(sv) => sv,
                    Err(error) => {
                        tracing::warn!(document = %self.name, %error, "invalid state vector");
                        return;
                    }
                };
                let txn = self.doc.transact();
                let diff = txn.encode_state_as_update_v1(&remote_sv);
                let own_sv = txn.state_vector().encode_v1();
                drop(txn);

                // Reply 1: [Sync][Step2 diff]
                let step2 = SyncMessage::Step2 {
                    update: Bytes::from(diff),
                }
                .to_payload();
                let frame =
                    MessageBuilder::new(&subscriber.raw_address).sync(MessageType::Sync, &step2);
                let _ = subscriber.outbound.try_send(Outbound::Frame(frame));

                // Reply 2: our own Step1, so the peer answers with its
                // Step2 (clients reply Step2 without initiating another
                // Step1, so there is no loop). Toward clients this is a
                // plain Sync frame — SyncReply (type 4) is server-internal
                // (Redis) and clients drop it. Suppressed when the inbound
                // frame was itself a SyncReply (the Redis relay path).
                if !inbound_was_reply {
                    let step1 = SyncMessage::Step1 {
                        state_vector: Bytes::from(own_sv),
                    }
                    .to_payload();
                    let frame = MessageBuilder::new(&subscriber.raw_address)
                        .sync(MessageType::Sync, &step1);
                    let _ = subscriber.outbound.try_send(Outbound::Frame(frame));
                }
            }
            SyncMessage::Step2 { update } | SyncMessage::Update { update } => {
                if let Some(subscriber) = conn_id.and_then(|id| self.subscribers.get(&id)) {
                    if subscriber.read_only {
                        // Read-only connections never mutate the document.
                        // A Step2 whose content the document already covers
                        // is acked saved=true (TS snapshotContainsUpdate);
                        // anything new is acked saved=false.
                        let saved = is_step2 && self.doc_covers_update(&update);
                        let frame = MessageBuilder::new(&subscriber.raw_address).sync_status(saved);
                        let _ = subscriber.outbound.try_send(Outbound::Frame(frame));
                        return;
                    }
                }

                let produced = {
                    let mut txn = self.doc.transact_mut();
                    let applied = match Update::decode_v1(&update) {
                        Ok(decoded) => txn.apply_update(decoded).map_err(|e| e.to_string()),
                        Err(error) => Err(error.to_string()),
                    };
                    match applied {
                        Ok(()) => txn.encode_update_v1(),
                        Err(error) => {
                            tracing::warn!(document = %self.name, %error, "update failed to apply");
                            return;
                        }
                    }
                };

                self.broadcast_update(&produced);
                self.mark_dirty();

                if let Some(subscriber) = conn_id.and_then(|id| self.subscribers.get(&id)) {
                    let frame = MessageBuilder::new(&subscriber.raw_address).sync_status(true);
                    let _ = subscriber.outbound.try_send(Outbound::Frame(frame));
                }
            }
        }
    }

    /// Whether the document already contains everything in `update`:
    /// every client clock in the update is covered by the document's state
    /// vector (the observable behavior of TS `snapshotContainsUpdate`).
    fn doc_covers_update(&self, update: &[u8]) -> bool {
        let Ok(decoded) = Update::decode_v1(update) else {
            return false;
        };
        let update_sv = decoded.state_vector();
        let txn = self.doc.transact();
        let doc_sv = txn.state_vector();
        update_sv
            .iter()
            .all(|(client, clock)| doc_sv.get(client) >= *clock)
    }

    fn apply_awareness(&mut self, conn_id: Option<ConnId>, update_bytes: Bytes) {
        let update = match AwarenessUpdate::decode_bytes(update_bytes) {
            Ok(update) => update,
            Err(error) => {
                tracing::warn!(document = %self.name, %error, "invalid awareness update");
                return;
            }
        };
        let changed = self.awareness.apply(&update);

        // Track which client ids this connection introduced (for cleanup).
        if let Some(subscriber) = conn_id.and_then(|id| self.subscribers.get_mut(&id)) {
            for entry in &changed.entries {
                if entry.is_removal() {
                    subscriber.client_ids.remove(&entry.client_id);
                } else {
                    subscriber.client_ids.insert(entry.client_id);
                }
            }
        }

        self.broadcast_awareness(&changed);
    }

    /// Broadcasts a document update produced by an apply to ALL subscribers
    /// — mirroring `Document.handleUpdate`, which fans the "update" event
    /// out to every connection (the sender applies its own update
    /// idempotently).
    fn broadcast_update(&self, update: &[u8]) {
        if update == EMPTY_UPDATE_V1 {
            return;
        }
        let payload = SyncMessage::Update {
            update: Bytes::copy_from_slice(update),
        }
        .to_payload();
        for subscriber in self.subscribers.values() {
            let frame =
                MessageBuilder::new(&subscriber.raw_address).sync(MessageType::Sync, &payload);
            let _ = subscriber.outbound.try_send(Outbound::Frame(frame));
        }
    }

    fn broadcast_awareness(&self, update: &AwarenessUpdate) {
        if update.entries.is_empty() {
            return;
        }
        for subscriber in self.subscribers.values() {
            send_awareness_to(subscriber, update);
        }
    }

    fn mark_dirty(&mut self) {
        let now = Instant::now();
        match &mut self.dirty {
            Some(state) => state.last_change = now,
            None => {
                self.dirty = Some(DirtyState {
                    dirty_since: now,
                    last_change: now,
                })
            }
        }
    }

    /// The next store deadline: `min(last_change + debounce, dirty_since +
    /// max_debounce)` — a store happens at least every `max_debounce` while
    /// changes keep arriving.
    fn store_deadline(&self) -> Option<Instant> {
        let state = self.dirty.as_ref()?;
        Some(std::cmp::min(
            state.last_change + self.config.debounce,
            state.dirty_since + self.config.max_debounce,
        ))
    }

    async fn store_now(&mut self) {
        if self.dirty.is_none() {
            return;
        }
        self.dirty = None;
        let Some(storage) = &self.storage else { return };
        let state = {
            let txn = self.doc.transact();
            Bytes::from(txn.encode_state_as_update_v1(&StateVector::default()))
        };
        if let Err(error) = storage.store(&self.name, state).await {
            tracing::error!(document = %self.name, %error, "store failed");
        }
    }
}

fn send_awareness_to(subscriber: &Subscriber, update: &AwarenessUpdate) {
    let frame = MessageBuilder::new(&subscriber.raw_address).awareness(&update.to_bytes());
    let _ = subscriber.outbound.try_send(Outbound::Frame(frame));
}
