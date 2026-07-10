//! Persistence trait — the Rust analogue of `@hocuspocus/extension-database`.

use async_trait::async_trait;
use bytes::Bytes;

use crate::BoxError;

/// Fetches and stores document state as yjs update (v1) binary blobs.
///
/// Backends (`hocuspocus-storage`: Postgres, SQLite, S3-compatible) and the
/// webhook persistence transport (`hocuspocus-webhook`) implement this; the
/// engine adapts it into `on_load_document` / `on_store_document` hooks the
/// way `Database.ts` does in TypeScript.
#[async_trait]
pub trait Storage: Send + Sync + 'static {
    /// Loads the persisted state for a document. `Ok(None)` means the
    /// document does not exist yet (a new document is created).
    async fn fetch(&self, document_name: &str) -> Result<Option<Bytes>, BoxError>;

    /// Persists the full document state (`encode_state_as_update` against
    /// the empty state vector — the same blob format the Node extensions
    /// write, so both implementations can share one database during
    /// migration).
    async fn store(&self, document_name: &str, state: Bytes) -> Result<(), BoxError>;
}
