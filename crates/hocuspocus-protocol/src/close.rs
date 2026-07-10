//! WebSocket close events, mirroring `packages/common/src/CloseEvents.ts`
//! byte-for-byte (codes and reason strings are asserted by provider tests).

/// A WebSocket close code plus its reason string.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CloseEvent {
    pub code: u16,
    pub reason: &'static str,
}

/// A data frame was received that is too large.
pub const MESSAGE_TOO_BIG: CloseEvent = CloseEvent {
    code: 1009,
    reason: "Message Too Big",
};

/// The server asks the client to reset its document view and reconnect.
pub const RESET_CONNECTION: CloseEvent = CloseEvent {
    code: 4205,
    reason: "Reset Connection",
};

/// Authentication is required and has failed or has not yet been provided.
pub const UNAUTHORIZED: CloseEvent = CloseEvent {
    code: 4401,
    reason: "Unauthorized",
};

/// The request was understood, but the server refuses action.
pub const FORBIDDEN: CloseEvent = CloseEvent {
    code: 4403,
    reason: "Forbidden",
};

/// The server timed out waiting for the client.
pub const CONNECTION_TIMEOUT: CloseEvent = CloseEvent {
    code: 4408,
    reason: "Connection Timeout",
};
