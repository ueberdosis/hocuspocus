//! Authentication trait for the standalone server and embedders.

use async_trait::async_trait;

use crate::BoxError;
use hocuspocus_protocol::Scope;

/// Everything known about a connection when its auth token arrives.
#[derive(Debug)]
pub struct AuthRequest<'a> {
    pub document_name: &'a str,
    pub token: &'a str,
    pub provider_version: Option<&'a str>,
    pub request_headers: &'a [(String, String)],
    pub remote_addr: Option<std::net::SocketAddr>,
}

/// A successful authentication decision.
#[derive(Debug)]
pub struct AuthDecision {
    pub scope: Scope,
    /// Merged into the connection [`crate::Context`] JSON data and echoed
    /// in later webhook events.
    pub context: serde_json::Map<String, serde_json::Value>,
}

/// Decides whether a connection may access a document.
///
/// Implementations: webhook authenticator (`hocuspocus-webhook`), static
/// token / JWT / allow-all in the server binary. Returning `Err` denies the
/// connection: the client receives `PermissionDenied` and close code 4401.
#[async_trait]
pub trait Authenticator: Send + Sync + 'static {
    async fn authenticate(&self, request: AuthRequest<'_>) -> Result<AuthDecision, BoxError>;
}

/// Connection lifecycle notifications (the webhook `connect`/`disconnect`
/// events; TS `onConnect`/`onDisconnect` hooks). `connect` runs BEFORE
/// authentication and may reject the connection.
#[async_trait]
pub trait EventHooks: Send + Sync + 'static {
    async fn connect(&self, document_name: &str) -> Result<(), BoxError> {
        let _ = document_name;
        Ok(())
    }
    async fn disconnect(&self, document_name: &str) {
        let _ = document_name;
    }
    /// A client sent a Stateless message (TS `onStateless`).
    async fn stateless(&self, document_name: &str, payload: &str) {
        let _ = (document_name, payload);
    }
}

/// Default no-op event hooks.
pub struct NoEvents;

#[async_trait]
impl EventHooks for NoEvents {}
