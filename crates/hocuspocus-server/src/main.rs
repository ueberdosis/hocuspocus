//! Standalone Hocuspocus server.
//!
//! M0 scaffold: loads configuration, binds the listener, announces
//! readiness as a single JSON line on stdout (consumed by the conformance
//! harness), serves `/` and `/healthz`, and shuts down gracefully on
//! SIGTERM/SIGINT. The WebSocket endpoint and the engine wiring land in M2.

mod config;

use std::net::SocketAddr;

use axum::routing::get;
use axum::Router;
use tokio::net::TcpListener;
use tokio::signal;

use config::Config;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let config_path = parse_config_arg();
    let config = Config::load(config_path.as_deref())?;

    let app = Router::new()
        .route("/", get(|| async { hocuspocus_axum::WELCOME_MESSAGE }))
        .route("/healthz", get(|| async { "ok" }));

    let listener = TcpListener::bind(&config.server.listen).await?;
    let local_addr: SocketAddr = listener.local_addr()?;

    // Machine-readable readiness line, always first on stdout: the
    // conformance harness starts the binary with port 0 and reads the
    // actual port from here.
    println!(
        "{}",
        serde_json::json!({
            "name": config.server.name,
            "address": local_addr.ip().to_string(),
            "port": local_addr.port(),
        })
    );

    if !config.server.quiet {
        tracing::info!("Hocuspocus (Rust) listening on {local_addr}");
    }

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("shut down gracefully");
    Ok(())
}

/// Reads `--config <path>` from argv or the `HOCUSPOCUS_CONFIG` variable.
fn parse_config_arg() -> Option<String> {
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        if arg == "--config" {
            return args.next();
        }
        if let Some(path) = arg.strip_prefix("--config=") {
            return Some(path.to_owned());
        }
    }
    std::env::var("HOCUSPOCUS_CONFIG").ok()
}

/// Resolves on SIGTERM or SIGINT — the trigger for the graceful shutdown
/// sequence (mirrors the TS `stopOnSignals` behavior).
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("install ctrl-c handler");
    };
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("install sigterm handler")
            .recv()
            .await;
    };
    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
