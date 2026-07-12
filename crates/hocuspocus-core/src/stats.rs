//! Engine-wide counters, kept as plain atomics so the hot paths stay
//! allocation- and lock-free. The standalone server renders them on
//! `/metrics`; embedders read [`EngineStats::snapshot`] and export however
//! they like (metric names live in `hocuspocus-metrics`).

use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};

#[derive(Debug, Default)]
pub struct EngineStats {
    /// Established document connections (gauge; TS `getConnectionsCount`).
    pub(crate) doc_connections: AtomicUsize,
    pub(crate) received_sync: AtomicU64,
    pub(crate) received_awareness: AtomicU64,
    pub(crate) received_stateless: AtomicU64,
    pub(crate) received_auth: AtomicU64,
    pub(crate) received_other: AtomicU64,
    pub(crate) sent: AtomicU64,
    pub(crate) stores_succeeded: AtomicU64,
    pub(crate) stores_failed: AtomicU64,
    /// Store skipped because a peer instance held the store lock.
    pub(crate) stores_skipped: AtomicU64,
    pub(crate) auth_denied: AtomicU64,
}

/// A point-in-time copy of every counter.
#[derive(Debug, Clone, Copy)]
pub struct StatsSnapshot {
    pub received_sync: u64,
    pub received_awareness: u64,
    pub received_stateless: u64,
    pub received_auth: u64,
    pub received_other: u64,
    pub sent: u64,
    pub stores_succeeded: u64,
    pub stores_failed: u64,
    pub stores_skipped: u64,
    pub auth_denied: u64,
}

impl EngineStats {
    pub(crate) fn incr(counter: &AtomicU64) {
        counter.fetch_add(1, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> StatsSnapshot {
        StatsSnapshot {
            received_sync: self.received_sync.load(Ordering::Relaxed),
            received_awareness: self.received_awareness.load(Ordering::Relaxed),
            received_stateless: self.received_stateless.load(Ordering::Relaxed),
            received_auth: self.received_auth.load(Ordering::Relaxed),
            received_other: self.received_other.load(Ordering::Relaxed),
            sent: self.sent.load(Ordering::Relaxed),
            stores_succeeded: self.stores_succeeded.load(Ordering::Relaxed),
            stores_failed: self.stores_failed.load(Ordering::Relaxed),
            stores_skipped: self.stores_skipped.load(Ordering::Relaxed),
            auth_denied: self.auth_denied.load(Ordering::Relaxed),
        }
    }

    /// Count one outbound wire frame (called by the transport's writer).
    pub fn count_sent(&self) {
        Self::incr(&self.sent);
    }
}
