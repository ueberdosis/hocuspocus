//! Engine configuration. Defaults mirror `defaultConfiguration` in
//! `packages/server/src/Hocuspocus.ts` exactly.

use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Configuration {
    /// Instance name, used in logging.
    pub name: Option<String>,
    /// Idle timeout: connections that stay silent longer are closed with
    /// close code 4408. Before authentication this is an absolute deadline
    /// measured from socket open that inbound frames must NOT refresh.
    pub timeout: Duration,
    /// Debounce interval for `on_store_document`.
    pub debounce: Duration,
    /// Upper bound: a dirty document is stored at least this often even
    /// while changes keep arriving.
    pub max_debounce: Duration,
    /// Whether to persist and unload a document immediately when its last
    /// connection closes (`false` respects the debounce and keeps the
    /// document warm).
    pub unload_immediately: bool,
    /// Max buffered bytes across all queues of an unauthenticated
    /// connection (GHSA-xwhh-v746-pj9m).
    pub max_unauthenticated_queue_size: usize,
    /// Max buffered messages while unauthenticated.
    pub max_unauthenticated_queue_messages: usize,
    /// Max distinct documents a connection may open before authenticating.
    pub max_pending_documents: usize,
    /// Outbound buffer budget per connection; a slower consumer is closed
    /// with 4205 (Reset Connection) so the provider reconnects and resyncs.
    /// This bound replaces Node's unbounded `ws` send buffer — a deliberate,
    /// documented behavioral difference.
    pub max_outbound_buffer_size: usize,
    /// Whether new `yrs::Doc`s run with garbage collection (TS
    /// `yDocOptions.gc`).
    pub gc: bool,
}

impl Default for Configuration {
    fn default() -> Self {
        Self {
            name: None,
            timeout: Duration::from_millis(60_000),
            debounce: Duration::from_millis(2_000),
            max_debounce: Duration::from_millis(10_000),
            unload_immediately: true,
            max_unauthenticated_queue_size: 5 * 1024 * 1024,
            max_unauthenticated_queue_messages: 1_000,
            max_pending_documents: 100,
            max_outbound_buffer_size: 16 * 1024 * 1024,
            gc: true,
        }
    }
}
