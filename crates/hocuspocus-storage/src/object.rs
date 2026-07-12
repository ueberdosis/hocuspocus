//! Object-store persistence (S3 and anything else `object_store` speaks:
//! GCS, Azure, MinIO, local filesystem, in-memory).
//!
//! Key layout matches `@hocuspocus/extension-s3`:
//! `{prefix}{documentName}.bin`, one full yjs update (v1) per object —
//! so a Node and a Rust fleet can share one bucket during migration.

use std::sync::Arc;

use async_trait::async_trait;
use bytes::Bytes;
use object_store::path::Path;
use object_store::{ObjectStore, ObjectStoreExt, PutPayload};

use hocuspocus_core::{BoxError, Storage};

pub struct ObjectStoreStorage {
    store: Arc<dyn ObjectStore>,
    /// Key prefix, e.g. `hocuspocus-documents/` (the Node extension's
    /// default).
    prefix: String,
}

impl ObjectStoreStorage {
    pub fn new(store: Arc<dyn ObjectStore>, prefix: impl Into<String>) -> Self {
        Self {
            store,
            prefix: prefix.into(),
        }
    }

    /// S3-backed storage from environment/explicit configuration.
    #[cfg(feature = "s3")]
    pub fn s3(
        bucket: &str,
        region: &str,
        endpoint: Option<&str>,
        prefix: impl Into<String>,
    ) -> Result<Self, BoxError> {
        let mut builder = object_store::aws::AmazonS3Builder::from_env()
            .with_bucket_name(bucket)
            .with_region(region);
        if let Some(endpoint) = endpoint {
            // MinIO-style endpoints need path-style addressing.
            builder = builder
                .with_endpoint(endpoint)
                .with_virtual_hosted_style_request(false);
            if endpoint.starts_with("http://") {
                builder = builder.with_allow_http(true);
            }
        }
        Ok(Self::new(Arc::new(builder.build()?), prefix))
    }

    fn key(&self, document_name: &str) -> Path {
        Path::from(format!("{}{}.bin", self.prefix, document_name))
    }
}

#[async_trait]
impl Storage for ObjectStoreStorage {
    async fn fetch(&self, document_name: &str) -> Result<Option<Bytes>, BoxError> {
        match self.store.get(&self.key(document_name)).await {
            Ok(result) => Ok(Some(result.bytes().await?)),
            Err(object_store::Error::NotFound { .. }) => Ok(None),
            Err(error) => Err(Box::new(error)),
        }
    }

    async fn store(&self, document_name: &str, state: Bytes) -> Result<(), BoxError> {
        self.store
            .put(&self.key(document_name), PutPayload::from_bytes(state))
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use object_store::memory::InMemory;

    #[tokio::test]
    async fn roundtrip_with_node_compatible_keys() {
        let memory = Arc::new(InMemory::new());
        let storage = ObjectStoreStorage::new(memory.clone(), "hocuspocus-documents/");

        assert!(storage.fetch("doc").await.unwrap().is_none());
        storage
            .store("doc", Bytes::from_static(&[1, 2, 3]))
            .await
            .unwrap();
        assert_eq!(
            storage.fetch("doc").await.unwrap().unwrap(),
            Bytes::from_static(&[1, 2, 3])
        );

        // The object key matches the Node extension's layout.
        let direct = memory
            .get(&Path::from("hocuspocus-documents/doc.bin"))
            .await
            .unwrap();
        assert_eq!(
            direct.bytes().await.unwrap(),
            Bytes::from_static(&[1, 2, 3])
        );
    }
}
