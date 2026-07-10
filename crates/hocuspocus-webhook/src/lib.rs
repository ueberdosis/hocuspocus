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

/// Webhook events, mirroring the Node extension's `Events`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Event {
    Auth,
    Create,
    Change,
    Connect,
    Disconnect,
}

impl Event {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Auth => "auth",
            Self::Create => "create",
            Self::Change => "change",
            Self::Connect => "connect",
            Self::Disconnect => "disconnect",
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
