//! HTTP webhook integration: authentication, persistence and event
//! notifications delegated to the user's application.
//!
//! Signature scheme is byte-compatible with `@hocuspocus/extension-webhook`
//! (`X-Hocuspocus-Signature-256: sha256=<hmac-sha256-hex>`), so existing
//! app-side verification code keeps working.
//!
//! # Status
//!
//! M0 scaffold — configuration and signing only; the HTTP client, the
//! `Authenticator`/`Storage` implementations and the event dispatch land in
//! M3 (see `crates/RFC.md` § Webhook contract).

use hmac::{Hmac, Mac};
use sha2::Sha256;

/// Header carrying the request signature.
pub const SIGNATURE_HEADER: &str = "X-Hocuspocus-Signature-256";

/// Header carrying the connection's auth context (JSON) on binary
/// persistence requests.
pub const CONTEXT_HEADER: &str = "X-Hocuspocus-Context";

/// Webhook events, mirroring the Node extension's `Events`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Event {
    Auth,
    Create,
    Change,
    Connect,
    Disconnect,
    Stateless,
}

impl Event {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Auth => "auth",
            Self::Create => "create",
            Self::Change => "change",
            Self::Connect => "connect",
            Self::Disconnect => "disconnect",
            Self::Stateless => "stateless",
        }
    }
}

/// Configuration for the webhook extension.
#[derive(Debug, Clone)]
pub struct WebhookConfiguration {
    /// Base URL that receives JSON event POSTs (and, when webhook
    /// persistence is enabled, `GET/PUT {url}/documents/{name}`).
    pub url: String,
    /// Shared secret for request signing.
    pub secret: String,
    /// Which events are delivered. Default: `[Change]`, like Node.
    pub events: Vec<Event>,
}

/// Computes the signature header value for a request body:
/// `sha256=<hex(hmac-sha256(secret, body))>`.
///
/// Matches `Webhook.createSignature` in
/// `packages/extension-webhook/src/index.ts`.
pub fn sign(secret: &str, body: &[u8]) -> String {
    let mut mac =
        Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("hmac accepts any key length");
    mac.update(body);
    let digest = mac.finalize().into_bytes();
    let mut out = String::with_capacity(7 + digest.len() * 2);
    out.push_str("sha256=");
    for byte in digest {
        use std::fmt::Write;
        write!(out, "{byte:02x}").expect("writing to string cannot fail");
    }
    out
}

/// Constant-time-ish verification of a received signature header value.
pub fn verify(secret: &str, body: &[u8], signature: &str) -> bool {
    let expected = sign(secret, body);
    // Compare without early exit on length match to avoid trivial timing
    // leaks; lengths are public (fixed-size digest).
    expected.len() == signature.len()
        && expected
            .bytes()
            .zip(signature.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signature_matches_node_extension() {
        // Node: crypto.createHmac('sha256', 'secret').update('{"a":1}').digest('hex')
        let signature = sign("secret", br#"{"a":1}"#);
        assert_eq!(
            signature,
            "sha256=aa9e2e3575f5d7098b6caccd790888c36d5fdb63342a73bada2d6a51747a8494"
        );
    }

    #[test]
    fn verify_accepts_valid_and_rejects_invalid() {
        let body = br#"{"event":"change"}"#;
        let signature = sign("secret", body);
        assert!(verify("secret", body, &signature));
        assert!(!verify("other-secret", body, &signature));
        assert!(!verify("secret", b"tampered", &signature));
        assert!(!verify("secret", body, "sha256=short"));
    }
}

/// Authenticates connections by POSTing an `auth` event to the webhook URL.
///
/// Request body: `{"event":"auth","payload":{"documentName":…,"token":…,
/// "providerVersion":…}}`, signed with [`SIGNATURE_HEADER`]. Responses:
/// `200 {"context": {...}, "scope": "read-write"|"readonly"}` grants
/// access; any other status denies it (the `reason` field, if present,
/// becomes the PermissionDenied reason).
pub struct WebhookAuthenticator {
    url: String,
    secret: String,
    client: reqwest::Client,
}

impl WebhookAuthenticator {
    pub fn new(url: impl Into<String>, secret: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            secret: secret.into(),
            client: reqwest::Client::new(),
        }
    }
}

#[derive(Debug, serde::Deserialize)]
struct AuthResponse {
    #[serde(default)]
    context: serde_json::Map<String, serde_json::Value>,
    #[serde(default)]
    scope: Option<String>,
    #[serde(default)]
    reason: Option<String>,
}

#[async_trait::async_trait]
impl hocuspocus_core::Authenticator for WebhookAuthenticator {
    async fn authenticate(
        &self,
        request: hocuspocus_core::AuthRequest<'_>,
    ) -> Result<hocuspocus_core::AuthDecision, hocuspocus_core::BoxError> {
        let body = serde_json::to_vec(&serde_json::json!({
            "event": Event::Auth.as_str(),
            "payload": {
                "documentName": request.document_name,
                "token": request.token,
                "providerVersion": request.provider_version,
            },
        }))?;
        let response = self
            .client
            .post(&self.url)
            .header("Content-Type", "application/json")
            .header(SIGNATURE_HEADER, sign(&self.secret, &body))
            .body(body)
            .send()
            .await?;

        let status = response.status();
        let parsed: AuthResponse = response.json().await.unwrap_or(AuthResponse {
            context: Default::default(),
            scope: None,
            reason: None,
        });

        if !status.is_success() {
            return Err(parsed
                .reason
                .unwrap_or_else(|| "permission-denied".to_owned())
                .into());
        }

        let scope = match parsed.scope.as_deref() {
            Some("readonly") => hocuspocus_protocol::Scope::ReadOnly,
            _ => hocuspocus_protocol::Scope::ReadWrite,
        };
        Ok(hocuspocus_core::AuthDecision {
            scope,
            context: parsed.context,
        })
    }
}

/// Persistence over the webhook binary endpoints:
/// `GET {base}/documents/{name}` (200 = yjs update v1, 404 = new document)
/// and `PUT {base}/documents/{name}` (body = full state). Requests are
/// signed over the canonical path (GET) or the raw body (PUT).
pub struct WebhookStorage {
    base_url: String,
    secret: String,
    client: reqwest::Client,
}

impl WebhookStorage {
    pub fn new(base_url: impl Into<String>, secret: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into(),
            secret: secret.into(),
            client: reqwest::Client::new(),
        }
    }

    fn document_url(&self, document_name: &str) -> String {
        let encoded: String = document_name
            .bytes()
            .flat_map(|byte| match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    vec![byte as char]
                }
                _ => format!("%{byte:02X}").chars().collect(),
            })
            .collect();
        format!(
            "{}/documents/{encoded}",
            self.base_url.trim_end_matches('/')
        )
    }
}

#[async_trait::async_trait]
impl hocuspocus_core::Storage for WebhookStorage {
    async fn fetch(
        &self,
        document_name: &str,
        context: &hocuspocus_core::storage::ContextData,
    ) -> Result<Option<bytes::Bytes>, hocuspocus_core::BoxError> {
        let url = self.document_url(document_name);
        let mut request = self
            .client
            .get(&url)
            .header(SIGNATURE_HEADER, sign(&self.secret, url.as_bytes()));
        if !context.is_empty() {
            request = request.header(CONTEXT_HEADER, serde_json::to_string(context)?);
        }
        let response = request.send().await?;
        match response.status() {
            reqwest::StatusCode::NOT_FOUND => Ok(None),
            status if status.is_success() => Ok(Some(response.bytes().await?)),
            status => {
                // An explicit `reason` in the failure body becomes the
                // client-visible PermissionDenied reason (TS `error.reason`).
                #[derive(serde::Deserialize, Default)]
                struct Denied {
                    #[serde(default)]
                    reason: Option<String>,
                }
                let denied: Denied = response.json().await.unwrap_or_default();
                match denied.reason {
                    Some(reason) => Err(Box::new(hocuspocus_core::Refused { reason })),
                    None => Err(format!("webhook fetch failed: {status}").into()),
                }
            }
        }
    }

    async fn store(
        &self,
        document_name: &str,
        state: bytes::Bytes,
        context: &hocuspocus_core::storage::ContextData,
    ) -> Result<(), hocuspocus_core::BoxError> {
        let url = self.document_url(document_name);
        let mut request = self
            .client
            .put(&url)
            .header("Content-Type", "application/octet-stream")
            .header(SIGNATURE_HEADER, sign(&self.secret, &state));
        if !context.is_empty() {
            request = request.header(CONTEXT_HEADER, serde_json::to_string(context)?);
        }
        let response = request.body(state).send().await?;
        if !response.status().is_success() {
            return Err(format!("webhook store failed: {}", response.status()).into());
        }
        Ok(())
    }
}

/// Posts `connect`/`disconnect` events to the webhook URL. `connect` is
/// awaited before authentication; a non-2xx response rejects the
/// connection (TS onConnect → Forbidden).
pub struct WebhookEvents {
    url: String,
    secret: String,
    events: Vec<Event>,
    client: reqwest::Client,
}

impl WebhookEvents {
    pub fn new(url: impl Into<String>, secret: impl Into<String>, events: Vec<Event>) -> Self {
        Self {
            url: url.into(),
            secret: secret.into(),
            events,
            client: reqwest::Client::new(),
        }
    }

    /// Like [`Self::post_body`], with a payload field; returns the response's
    /// optional `respond` payload.
    async fn post_with(
        &self,
        event: Event,
        document_name: &str,
        payload: &str,
        context: &hocuspocus_core::storage::ContextData,
    ) -> Result<Option<String>, hocuspocus_core::BoxError> {
        let body = serde_json::to_vec(&serde_json::json!({
            "event": event.as_str(),
            "payload": { "documentName": document_name, "payload": payload, "context": context },
        }))?;
        Ok(self.post_body(body).await?.respond)
    }

    async fn post_body(&self, body: Vec<u8>) -> Result<EventResponse, hocuspocus_core::BoxError> {
        let response = self
            .client
            .post(&self.url)
            .header("Content-Type", "application/json")
            .header(SIGNATURE_HEADER, sign(&self.secret, &body))
            .body(body)
            .send()
            .await?;
        if !response.status().is_success() {
            #[derive(serde::Deserialize, Default)]
            struct Denied {
                #[serde(default)]
                reason: Option<String>,
            }
            let denied: Denied = response.json().await.unwrap_or_default();
            return Err(denied
                .reason
                .unwrap_or_else(|| "forbidden".to_owned())
                .into());
        }
        Ok(response.json().await.unwrap_or_default())
    }
}

/// Successful JSON event response fields the server acts on.
#[derive(serde::Deserialize, Default)]
struct EventResponse {
    /// `stateless`: payload to send back to the originating connection.
    #[serde(default)]
    respond: Option<String>,
    /// `connect`: data merged into the connection context.
    #[serde(default)]
    context: serde_json::Map<String, serde_json::Value>,
}

#[async_trait::async_trait]
impl hocuspocus_core::EventHooks for WebhookEvents {
    async fn connect(
        &self,
        document_name: &str,
    ) -> Result<hocuspocus_core::storage::ContextData, hocuspocus_core::BoxError> {
        if !self.events.contains(&Event::Connect) {
            return Ok(Default::default());
        }
        let body = serde_json::to_vec(&serde_json::json!({
            "event": Event::Connect.as_str(),
            "payload": { "documentName": document_name },
        }))?;
        Ok(self.post_body(body).await?.context)
    }

    async fn disconnect(
        &self,
        document_name: &str,
        context: &hocuspocus_core::storage::ContextData,
    ) {
        if !self.events.contains(&Event::Disconnect) {
            return;
        }
        let body = match serde_json::to_vec(&serde_json::json!({
            "event": Event::Disconnect.as_str(),
            "payload": { "documentName": document_name, "context": context },
        })) {
            Ok(body) => body,
            Err(_) => return,
        };
        if let Err(error) = self.post_body(body).await {
            tracing::warn!(%error, "disconnect webhook failed");
        }
    }

    async fn change(
        &self,
        document_name: &str,
        update: &[u8],
        context: &hocuspocus_core::storage::ContextData,
    ) {
        if !self.events.contains(&Event::Change) {
            return;
        }
        use base64::Engine;
        let encoded = base64::engine::general_purpose::STANDARD.encode(update);
        let body = match serde_json::to_vec(&serde_json::json!({
            "event": Event::Change.as_str(),
            "payload": { "documentName": document_name, "update": encoded, "context": context },
        })) {
            Ok(body) => body,
            Err(_) => return,
        };
        if let Err(error) = self.post_body(body).await {
            tracing::warn!(%error, "change webhook failed");
        }
    }

    async fn stateless(
        &self,
        document_name: &str,
        payload: &str,
        context: &hocuspocus_core::storage::ContextData,
    ) -> Option<String> {
        if !self.events.contains(&Event::Stateless) {
            return None;
        }
        match self
            .post_with(Event::Stateless, document_name, payload, context)
            .await
        {
            Ok(response) => response,
            Err(error) => {
                tracing::warn!(%error, "stateless webhook failed");
                None
            }
        }
    }
}
