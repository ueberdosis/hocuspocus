//! Postgres persistence: one `documents(name, data)` row per document,
//! full yjs update (v1) blobs — the same storage contract as the other
//! backends.

use async_trait::async_trait;
use bytes::Bytes;
use sqlx::{PgPool, Row};

use hocuspocus_core::{BoxError, Storage};

pub const SCHEMA: &str = r#"CREATE TABLE IF NOT EXISTS documents (
  name text PRIMARY KEY,
  data bytea NOT NULL
)"#;

pub struct PostgresStorage {
    pool: PgPool,
}

impl PostgresStorage {
    /// Connects to `url` (`postgres://…`) and ensures the schema exists.
    pub async fn connect(url: &str) -> Result<Self, BoxError> {
        let pool = PgPool::connect(url).await?;
        sqlx::query(SCHEMA).execute(&pool).await?;
        Ok(Self { pool })
    }
}

#[async_trait]
impl Storage for PostgresStorage {
    async fn fetch(&self, document_name: &str) -> Result<Option<Bytes>, BoxError> {
        let row = sqlx::query("SELECT data FROM documents WHERE name = $1")
            .bind(document_name)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(|row| Bytes::from(row.get::<Vec<u8>, _>("data"))))
    }

    async fn store(&self, document_name: &str, state: Bytes) -> Result<(), BoxError> {
        sqlx::query(
            "INSERT INTO documents (name, data) VALUES ($1, $2)
    ON CONFLICT (name) DO UPDATE SET data = excluded.data",
        )
        .bind(document_name)
        .bind(state.as_ref())
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
