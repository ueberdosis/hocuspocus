//! Persistence backends implementing [`hocuspocus_core::Storage`].
//!
//! Planned backends, each behind a cargo feature (M3):
//!
//! - `sqlite` / `postgres` via sqlx — writing the same `documents(name, data)`
//!   row shape as `@hocuspocus/extension-sqlite`, so a Node and a Rust
//!   fleet can share one database during migration.
//! - `s3` via object_store — same `{prefix}{documentName}.bin` object keys
//!   as `@hocuspocus/extension-s3`.
//!
//! # Status
//!
//! M0 scaffold — ships only [`InMemoryStorage`], which backs unit tests and
//! the default standalone-server configuration (no persistence configured).

#[cfg(feature = "object")]
pub mod object;
#[cfg(feature = "postgres")]
pub mod postgres;
#[cfg(feature = "sqlite")]
pub mod sqlite;

#[cfg(feature = "object")]
pub use object::ObjectStoreStorage;
#[cfg(feature = "postgres")]
pub use postgres::PostgresStorage;
#[cfg(feature = "sqlite")]
pub use sqlite::SqliteStorage;

use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use bytes::Bytes;

use hocuspocus_core::storage::ContextData;
use hocuspocus_core::{BoxError, Storage};

/// Non-persistent storage: documents live only as long as the process.
#[derive(Debug, Default)]
pub struct InMemoryStorage {
    documents: Mutex<HashMap<String, Bytes>>,
}

impl InMemoryStorage {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl Storage for InMemoryStorage {
    async fn fetch(
        &self,
        document_name: &str,
        _context: &ContextData,
    ) -> Result<Option<Bytes>, BoxError> {
        Ok(self
            .documents
            .lock()
            .expect("storage poisoned")
            .get(document_name)
            .cloned())
    }

    async fn store(
        &self,
        document_name: &str,
        state: Bytes,
        _context: &ContextData,
    ) -> Result<(), BoxError> {
        self.documents
            .lock()
            .expect("storage poisoned")
            .insert(document_name.to_owned(), state);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn fetch_missing_returns_none() {
        let storage = InMemoryStorage::new();
        assert!(storage
            .fetch("doc", &Default::default())
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn store_then_fetch() {
        let storage = InMemoryStorage::new();
        storage
            .store("doc", Bytes::from_static(&[1, 2, 3]), &Default::default())
            .await
            .unwrap();
        assert_eq!(
            storage
                .fetch("doc", &Default::default())
                .await
                .unwrap()
                .unwrap(),
            Bytes::from_static(&[1, 2, 3])
        );
    }
}
