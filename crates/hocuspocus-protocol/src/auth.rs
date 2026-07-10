//! Auth sub-messages, mirroring `packages/common/src/auth.ts`.

use crate::types::AuthMessageType;
use crate::varint::{Reader, Writer};
use crate::ProtocolError;

/// Authorization scope granted to a connection.
///
/// Serialized as the var-strings `"readonly"` / `"read-write"` — exact
/// values the provider matches on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Scope {
    ReadOnly,
    ReadWrite,
}

impl Scope {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::ReadOnly => "readonly",
            Self::ReadWrite => "read-write",
        }
    }

    pub fn parse(value: &str) -> Result<Self, ProtocolError> {
        match value {
            "readonly" => Ok(Self::ReadOnly),
            "read-write" => Ok(Self::ReadWrite),
            other => Err(ProtocolError::UnknownScope(other.to_owned())),
        }
    }
}

/// Auth message sent by a client.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthInbound {
    /// `[Token][varString token][varString providerVersion]?`
    ///
    /// The trailing provider version was added later; older providers omit
    /// it, so it is read only if bytes remain (TS: `decoding.hasContent`).
    Token {
        token: String,
        provider_version: Option<String>,
    },
}

impl AuthInbound {
    /// Decodes the payload of an `Auth` envelope received from a client.
    pub fn decode(reader: &mut Reader) -> Result<Self, ProtocolError> {
        match AuthMessageType::try_from(reader.read_var_uint()?)? {
            AuthMessageType::Token => {
                let token = reader.read_var_string()?;
                let provider_version = if reader.has_content() {
                    Some(reader.read_var_string()?)
                } else {
                    None
                };
                Ok(Self::Token {
                    token,
                    provider_version,
                })
            }
            other => Err(ProtocolError::UnknownAuthMessageType(other as u64)),
        }
    }

    /// Encodes this message (client-side encoding; used for tests and the
    /// differential harness).
    pub fn encode(&self, writer: &mut Writer) {
        match self {
            Self::Token {
                token,
                provider_version,
            } => {
                writer.write_var_uint(AuthMessageType::Token as u64);
                writer.write_var_string(token);
                if let Some(version) = provider_version {
                    writer.write_var_string(version);
                }
            }
        }
    }
}

/// Auth message sent by the server.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthOutbound {
    /// Bare `[Token]` — asks the client to (re-)send its token
    /// (TS `writeTokenSyncRequest`, drives `onTokenSync`).
    TokenRequest,
    /// `[PermissionDenied][varString reason]`
    PermissionDenied { reason: String },
    /// `[Authenticated][varString scope]`
    Authenticated { scope: Scope },
}

impl AuthOutbound {
    pub fn encode(&self, writer: &mut Writer) {
        match self {
            Self::TokenRequest => writer.write_var_uint(AuthMessageType::Token as u64),
            Self::PermissionDenied { reason } => {
                writer.write_var_uint(AuthMessageType::PermissionDenied as u64);
                writer.write_var_string(reason);
            }
            Self::Authenticated { scope } => {
                writer.write_var_uint(AuthMessageType::Authenticated as u64);
                writer.write_var_string(scope.as_str());
            }
        }
    }

    /// Decodes a server auth message (client-side decoding; used for tests
    /// and the differential harness).
    pub fn decode(reader: &mut Reader) -> Result<Self, ProtocolError> {
        match AuthMessageType::try_from(reader.read_var_uint()?)? {
            AuthMessageType::Token => Ok(Self::TokenRequest),
            AuthMessageType::PermissionDenied => Ok(Self::PermissionDenied {
                reason: reader.read_var_string()?,
            }),
            AuthMessageType::Authenticated => Ok(Self::Authenticated {
                scope: Scope::parse(&reader.read_var_string()?)?,
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_with_provider_version_roundtrip() {
        let message = AuthInbound::Token {
            token: "secret".into(),
            provider_version: Some("4.3.0".into()),
        };
        let mut writer = Writer::new();
        message.encode(&mut writer);
        let mut reader = Reader::new(writer.freeze());
        assert_eq!(AuthInbound::decode(&mut reader).unwrap(), message);
    }

    #[test]
    fn token_without_provider_version_is_accepted() {
        // Old providers stop after the token var-string.
        let message = AuthInbound::Token {
            token: "secret".into(),
            provider_version: None,
        };
        let mut writer = Writer::new();
        message.encode(&mut writer);
        let mut reader = Reader::new(writer.freeze());
        assert_eq!(AuthInbound::decode(&mut reader).unwrap(), message);
    }

    #[test]
    fn outbound_roundtrip() {
        for message in [
            AuthOutbound::TokenRequest,
            AuthOutbound::PermissionDenied {
                reason: "permission-denied".into(),
            },
            AuthOutbound::Authenticated {
                scope: Scope::ReadOnly,
            },
            AuthOutbound::Authenticated {
                scope: Scope::ReadWrite,
            },
        ] {
            let mut writer = Writer::new();
            message.encode(&mut writer);
            let mut reader = Reader::new(writer.freeze());
            assert_eq!(AuthOutbound::decode(&mut reader).unwrap(), message);
        }
    }

    #[test]
    fn scope_strings_match_typescript() {
        assert_eq!(Scope::ReadOnly.as_str(), "readonly");
        assert_eq!(Scope::ReadWrite.as_str(), "read-write");
    }
}
