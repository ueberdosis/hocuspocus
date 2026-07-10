//! Server-side awareness state, wire-compatible with
//! `y-protocols/awareness`.
//!
//! The server never has a "local" awareness state; it stores the latest
//! `(clock, state)` per client, applies inbound updates with the
//! y-protocols clock rules, and answers `QueryAwareness` with the full
//! state. Entries are kept as raw JSON text so relayed updates re-encode
//! byte-faithfully.

use std::collections::HashMap;

use hocuspocus_protocol::{AwarenessEntry, AwarenessUpdate};

#[derive(Debug, Clone)]
struct ClientRecord {
    clock: u64,
    /// `None` = client removed (tombstone keeps the clock for ordering).
    state_json: Option<String>,
}

/// Awareness bookkeeping for one document.
#[derive(Debug, Default)]
pub struct ServerAwareness {
    clients: HashMap<u64, ClientRecord>,
}

impl ServerAwareness {
    pub fn new() -> Self {
        Self::default()
    }

    /// Applies an inbound update following the `applyAwarenessUpdate`
    /// rules: an entry wins if its clock is newer, or equal-clock removals
    /// beat a live state. Returns the entries that actually changed local
    /// state — exactly what must be broadcast to subscribers.
    pub fn apply(&mut self, update: &AwarenessUpdate) -> AwarenessUpdate {
        let mut changed = Vec::new();
        for entry in &update.entries {
            let previous = self.clients.get(&entry.client_id);
            let applies = match previous {
                None => true,
                Some(record) => {
                    record.clock < entry.clock
                        || (record.clock == entry.clock
                            && entry.is_removal()
                            && record.state_json.is_some())
                }
            };
            if !applies {
                continue;
            }
            self.clients.insert(
                entry.client_id,
                ClientRecord {
                    clock: entry.clock,
                    state_json: (!entry.is_removal()).then(|| entry.state_json.clone()),
                },
            );
            changed.push(entry.clone());
        }
        AwarenessUpdate { entries: changed }
    }

    /// Removes the given clients (used when their connection goes away),
    /// producing the removal update to broadcast. Mirrors
    /// `removeAwarenessStates`.
    pub fn remove_clients(&mut self, client_ids: impl IntoIterator<Item = u64>) -> AwarenessUpdate {
        let mut entries = Vec::new();
        for client_id in client_ids {
            let Some(record) = self.clients.get_mut(&client_id) else {
                continue;
            };
            if record.state_json.is_none() {
                continue;
            }
            record.clock += 1;
            record.state_json = None;
            entries.push(AwarenessEntry {
                client_id,
                clock: record.clock,
                state_json: "null".to_owned(),
            });
        }
        AwarenessUpdate { entries }
    }

    /// The full current state (live clients only), for `QueryAwareness`
    /// replies and the initial push to a new connection.
    pub fn full_update(&self) -> AwarenessUpdate {
        let mut entries: Vec<_> = self
            .clients
            .iter()
            .filter_map(|(client_id, record)| {
                record.state_json.as_ref().map(|state| AwarenessEntry {
                    client_id: *client_id,
                    clock: record.clock,
                    state_json: state.clone(),
                })
            })
            .collect();
        entries.sort_by_key(|entry| entry.client_id);
        AwarenessUpdate { entries }
    }

    /// Number of clients with a live state.
    pub fn live_count(&self) -> usize {
        self.clients
            .values()
            .filter(|record| record.state_json.is_some())
            .count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(client_id: u64, clock: u64, state: &str) -> AwarenessEntry {
        AwarenessEntry {
            client_id,
            clock,
            state_json: state.to_owned(),
        }
    }

    #[test]
    fn newer_clock_wins_older_loses() {
        let mut awareness = ServerAwareness::new();
        let changed = awareness.apply(&AwarenessUpdate {
            entries: vec![entry(1, 2, r#"{"a":1}"#)],
        });
        assert_eq!(changed.entries.len(), 1);

        // Older clock is ignored.
        let changed = awareness.apply(&AwarenessUpdate {
            entries: vec![entry(1, 1, r#"{"a":0}"#)],
        });
        assert!(changed.entries.is_empty());

        // Newer clock applies.
        let changed = awareness.apply(&AwarenessUpdate {
            entries: vec![entry(1, 3, r#"{"a":2}"#)],
        });
        assert_eq!(changed.entries.len(), 1);
        assert_eq!(awareness.live_count(), 1);
    }

    #[test]
    fn equal_clock_removal_beats_live_state() {
        let mut awareness = ServerAwareness::new();
        awareness.apply(&AwarenessUpdate {
            entries: vec![entry(1, 5, r#"{"a":1}"#)],
        });
        let changed = awareness.apply(&AwarenessUpdate {
            entries: vec![entry(1, 5, "null")],
        });
        assert_eq!(changed.entries.len(), 1);
        assert_eq!(awareness.live_count(), 0);

        // But an equal-clock removal of an already-removed client is a no-op.
        let changed = awareness.apply(&AwarenessUpdate {
            entries: vec![entry(1, 5, "null")],
        });
        assert!(changed.entries.is_empty());
    }

    #[test]
    fn remove_clients_bumps_clock() {
        let mut awareness = ServerAwareness::new();
        awareness.apply(&AwarenessUpdate {
            entries: vec![entry(7, 3, r#"{"user":"jan"}"#)],
        });
        let removal = awareness.remove_clients([7]);
        assert_eq!(removal.entries.len(), 1);
        assert_eq!(removal.entries[0].clock, 4);
        assert!(removal.entries[0].is_removal());
        assert_eq!(awareness.live_count(), 0);
        // Removing an absent client produces nothing.
        assert!(awareness.remove_clients([9]).entries.is_empty());
    }

    #[test]
    fn full_update_lists_live_clients_only() {
        let mut awareness = ServerAwareness::new();
        awareness.apply(&AwarenessUpdate {
            entries: vec![entry(1, 1, r#"{"a":1}"#), entry(2, 1, r#"{"b":2}"#)],
        });
        awareness.remove_clients([1]);
        let full = awareness.full_update();
        assert_eq!(full.entries.len(), 1);
        assert_eq!(full.entries[0].client_id, 2);
    }
}
