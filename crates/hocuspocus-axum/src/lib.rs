//! Axum/WebSocket transport for the Hocuspocus engine.
//!
//! Keeps `hocuspocus-core` free of HTTP concerns, mirroring how
//! `Server.ts` wraps the transport-agnostic `Hocuspocus.ts` engine in
//! TypeScript. Embedders who use a different HTTP stack can skip this crate
//! and pump [`hocuspocus_core::SocketChannels`] themselves.

use axum::extract::ws::{CloseFrame, Message, WebSocket};
use hocuspocus_core::{Engine, Outbound};

/// Response body served for plain HTTP requests, matching the TypeScript
/// server's default request handler.
pub const WELCOME_MESSAGE: &str = "Welcome to Hocuspocus!";

/// Pumps one accepted WebSocket against the engine: binary frames go in,
/// engine frames come out, [`Outbound::Close`] closes with the engine's
/// code and reason. Returns when the socket is gone.
pub async fn serve_socket(engine: Engine, socket: WebSocket) {
    let stats = engine.stats_handle();
    let mut channels = engine.connect();
    let (mut sink, mut stream) = futures::StreamExt::split(socket);

    let writer = tokio::spawn(async move {
        use futures::SinkExt;
        while let Some(outbound) = channels.outbound.recv().await {
            match outbound {
                Outbound::Frame(frame) => {
                    if sink.send(Message::Binary(frame)).await.is_err() {
                        break;
                    }
                    stats.count_sent();
                }
                Outbound::Close { code, reason } => {
                    let _ = sink
                        .send(Message::Close(Some(CloseFrame {
                            code,
                            reason: reason.into(),
                        })))
                        .await;
                    break;
                }
            }
        }
    });

    let mut engine_gone = false;
    while let Some(message) = futures::StreamExt::next(&mut stream).await {
        let Ok(message) = message else { break };
        match message {
            Message::Binary(data) => {
                if channels.inbound.send(data).await.is_err() {
                    engine_gone = true;
                    break;
                }
            }
            // WebSocket-level ping/pong is answered by axum automatically.
            Message::Ping(_) | Message::Pong(_) | Message::Text(_) => {}
            Message::Close(_) => break,
        }
    }

    if engine_gone {
        // The engine closed the connection while the client was still
        // sending. Drain the stream (bounded) until the client answers the
        // close handshake: dropping a socket with unread inbound data
        // resets the TCP connection, destroying the in-flight close frame
        // (the client would see 1006 instead of our close code).
        let _ = tokio::time::timeout(std::time::Duration::from_secs(3), async {
            while let Some(Ok(message)) = futures::StreamExt::next(&mut stream).await {
                if matches!(message, Message::Close(_)) {
                    break;
                }
            }
        })
        .await;
    }

    // Dropping the inbound sender tears the engine-side connection down.
    drop(channels.inbound);
    let _ = writer.await;
}
