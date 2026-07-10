//! SQLite persistence, byte-compatible with `@hocuspocus/extension-sqlite`:
//! identical `documents(name, data)` schema and upsert, so a Node and a
//! Rust fleet can share one database file during migration.

use async_trait::async_trait;
use bytes::Bytes;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};

use hocuspocus_core::{BoxError, Storage};

/// The exact schema `extension-sqlite` creates.
pub const SCHEMA: &str = r#"CREATE TABLE IF NOT EXISTS "documents" (
  "name" varchar(255) NOT NULL,
  "data" blob NOT NULL,
  UNIQUE(name)
)"#;

pub struct SqliteStorage {
    pool: SqlitePool,
}

impl SqliteStorage {
    /// Opens (creating if missing) the database at `path`; `:memory:` gives
    /// a non-persistent database, like the Node extension's default.
    pub async fn open(path: &str) -> Result<Self, BoxError> {
        let options = if path == ":memory:" {
            SqliteConnectOptions::new().in_memory(true)
        } else {
            SqliteConnectOptions::new()
                .filename(path)
                .create_if_missing(true)
        };
        // An in-memory sqlite database exists per connection; a single
        // connection keeps it coherent.
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await?;
        sqlx::query(SCHEMA).execute(&pool).await?;
        Ok(Self { pool })
    }
}

#[async_trait]
impl Storage for SqliteStorage {
    async fn fetch(&self, document_name: &str) -> Result<Option<Bytes>, BoxError> {
        let row = sqlx::query(r#"SELECT data FROM "documents" WHERE name = ? ORDER BY rowid DESC"#)
            .bind(document_name)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.map(|row| Bytes::from(row.get::<Vec<u8>, _>("data"))))
    }

    async fn store(&self, document_name: &str, state: Bytes) -> Result<(), BoxError> {
        sqlx::query(
            r#"INSERT INTO "documents" ("name", "data") VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET data = excluded.data"#,
        )
        .bind(document_name)
        .bind(state.as_ref())
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn roundtrip_and_upsert() {
        let storage = SqliteStorage::open(":memory:").await.unwrap();
        assert!(storage.fetch("doc").await.unwrap().is_none());
        storage
            .store("doc", Bytes::from_static(&[1, 2]))
            .await
            .unwrap();
        storage
            .store("doc", Bytes::from_static(&[3, 4, 5]))
            .await
            .unwrap();
        assert_eq!(
            storage.fetch("doc").await.unwrap().unwrap(),
            Bytes::from_static(&[3, 4, 5])
        );
    }
}
