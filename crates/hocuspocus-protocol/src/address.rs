//! Document addressing / routing keys.
//!
//! One WebSocket may host several documents. Every enveloped message starts
//! with an address string that is either the plain document name or, for
//! session-aware providers, `documentName + "\0" + sessionId` (see
//! `packages/common/src/routingKey.ts`).
//!
//! Replies MUST echo the exact raw address the connection used (the TS
//! `Connection.messageAddress`), not the bare document name.

use std::sync::Arc;

/// Routing-key separator between document name and session id.
pub const SESSION_SEPARATOR: char = '\0';

/// A parsed document address.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct DocumentAddress {
    /// The exact address as received on the wire; used verbatim in replies.
    pub raw: Arc<str>,
    /// The document name (raw address up to the first `\0`).
    pub document_name: Arc<str>,
    /// The session id (raw address after the first `\0`), if present.
    pub session_id: Option<Arc<str>>,
}

impl DocumentAddress {
    /// Parses a raw routing key into its components.
    pub fn parse(raw: &str) -> Self {
        match raw.split_once(SESSION_SEPARATOR) {
            Some((name, session)) => Self {
                raw: Arc::from(raw),
                document_name: Arc::from(name),
                session_id: Some(Arc::from(session)),
            },
            None => {
                let name: Arc<str> = Arc::from(raw);
                Self {
                    raw: name.clone(),
                    document_name: name,
                    session_id: None,
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_document_name() {
        let address = DocumentAddress::parse("my-document");
        assert_eq!(&*address.raw, "my-document");
        assert_eq!(&*address.document_name, "my-document");
        assert_eq!(address.session_id, None);
    }

    #[test]
    fn session_aware_routing_key() {
        let address = DocumentAddress::parse("my-document\0session-123");
        assert_eq!(&*address.raw, "my-document\0session-123");
        assert_eq!(&*address.document_name, "my-document");
        assert_eq!(address.session_id.as_deref(), Some("session-123"));
    }

    #[test]
    fn only_first_separator_splits() {
        let address = DocumentAddress::parse("doc\0a\0b");
        assert_eq!(&*address.document_name, "doc");
        assert_eq!(address.session_id.as_deref(), Some("a\0b"));
    }
}
