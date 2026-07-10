//! Observability: Prometheus metrics and tracing for Hocuspocus.
//!
//! Uses the `metrics` facade so embedders can plug their own exporter; the
//! standalone server installs a Prometheus exporter on a separate listener.
//!
//! # Status
//!
//! M0 scaffold — defines the metric names as constants so dashboards and
//! alerts can be prepared before the recording extension lands in M5.

/// Currently open WebSocket connections. Gauge.
pub const CONNECTIONS: &str = "hocuspocus_connections";

/// Currently loaded documents. Gauge.
pub const DOCUMENTS: &str = "hocuspocus_documents";

/// Inbound messages, labeled by message type. Counter.
pub const MESSAGES_RECEIVED: &str = "hocuspocus_messages_received_total";

/// Outbound messages, labeled by message type. Counter.
pub const MESSAGES_SENT: &str = "hocuspocus_messages_sent_total";

/// Document store executions, labeled by outcome. Counter.
pub const DOCUMENT_STORES: &str = "hocuspocus_document_stores_total";

/// Time spent applying a sync payload to a document. Histogram (seconds).
pub const SYNC_APPLY_DURATION: &str = "hocuspocus_sync_apply_duration_seconds";

/// Time spent encoding document state for persistence. Histogram (seconds).
pub const STORE_ENCODE_DURATION: &str = "hocuspocus_store_encode_duration_seconds";

/// Connections closed because the outbound buffer budget was exceeded
/// (slow client, close code 4205). Counter.
pub const SLOW_CLIENT_DISCONNECTS: &str = "hocuspocus_slow_client_disconnects_total";
