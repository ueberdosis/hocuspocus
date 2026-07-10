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
