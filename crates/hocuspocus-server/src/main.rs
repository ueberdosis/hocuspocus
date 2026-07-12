//! Standalone Hocuspocus server.
//!
//! M2: serves the collaboration engine over WebSockets on any path, plus
//! `/healthz` and the control API (`/control/stats`,
//! `/control/close-connections`) used by operators and the conformance
//! harness. Storage defaults to in-memory; persistent backends and webhook
//! auth land in M3.

mod config;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::extract::{State, WebSocketUpgrade};
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::Router;
use tokio::net::TcpListener;
use tokio::signal;

use config::Config;
use hocuspocus_core::{Configuration, Engine};
use hocuspocus_protocol::close;
use hocuspocus_storage::InMemoryStorage;

#[derive(Clone)]
struct AppState {
    engine: Engine,
}

#[tokio::main]
async fn main() -> Result<(), hocuspocus_core::BoxError> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .init();

    let config_path = parse_config_arg();
    let config = Config::load(config_path.as_deref())?;

    let engine_config = Configuration {
        name: config.server.name.clone(),
        timeout: std::time::Duration::from_millis(config.server.timeout_ms),
        debounce: std::time::Duration::from_millis(config.server.debounce_ms),
        max_debounce: std::time::Duration::from_millis(config.server.max_debounce_ms),
        unload_immediately: config.server.unload_immediately,
        max_unauthenticated_queue_size: config.server.max_unauthenticated_queue_size,
        max_unauthenticated_queue_messages: config.server.max_unauthenticated_queue_messages,
        max_pending_documents: config.server.max_pending_documents,
        ..Configuration::default()
    };
    let authenticator: Arc<dyn hocuspocus_core::Authenticator> = match config.auth.mode {
        config::AuthMode::None => Arc::new(hocuspocus_core::AllowAll),
        config::AuthMode::Webhook => {
            let url = config
                .webhook
                .url
                .clone()
                .ok_or("[auth] mode = \"webhook\" requires [webhook] url")?;
            Arc::new(hocuspocus_webhook::WebhookAuthenticator::new(
                url,
                config.webhook.secret.clone(),
            ))
        }
    };
    let storage: Arc<dyn hocuspocus_core::Storage> = match config.storage.backend {
        config::StorageBackend::Memory => Arc::new(InMemoryStorage::new()),
        config::StorageBackend::Sqlite => {
            Arc::new(hocuspocus_storage::SqliteStorage::open(&config.storage.path).await?)
        }
        config::StorageBackend::Postgres => {
            let url = config
                .storage
                .url
                .clone()
                .ok_or("[storage] backend = \"postgres\" requires [storage] url")?;
            Arc::new(hocuspocus_storage::PostgresStorage::connect(&url).await?)
        }
        config::StorageBackend::S3 => {
            let bucket = config
                .storage
                .bucket
                .clone()
                .ok_or("[storage] backend = \"s3\" requires [storage] bucket")?;
            Arc::new(hocuspocus_storage::ObjectStoreStorage::s3(
                &bucket,
                &config.storage.region,
                config.storage.endpoint.as_deref(),
                config.storage.prefix.clone(),
            )?)
        }
        config::StorageBackend::Webhook => {
            let url = config
                .webhook
                .url
                .clone()
                .ok_or("[storage] backend = \"webhook\" requires [webhook] url")?;
            Arc::new(hocuspocus_webhook::WebhookStorage::new(
                url,
                config.webhook.secret.clone(),
            ))
        }
    };
    let events: Arc<dyn hocuspocus_core::EventHooks> =
        match (&config.webhook.url, config.webhook.events.as_str()) {
            (Some(url), events) if !events.is_empty() => {
                let events = events
                    .split(',')
                    .filter_map(|event| match event.trim() {
                        "change" => Some(hocuspocus_webhook::Event::Change),
                        "connect" => Some(hocuspocus_webhook::Event::Connect),
                        "disconnect" => Some(hocuspocus_webhook::Event::Disconnect),
                        "stateless" => Some(hocuspocus_webhook::Event::Stateless),
                        _ => None,
                    })
                    .collect();
                Arc::new(hocuspocus_webhook::WebhookEvents::new(
                    url.clone(),
                    config.webhook.secret.clone(),
                    events,
                ))
            }
            _ => Arc::new(hocuspocus_core::NoEvents),
        };
    let scaler: Option<Arc<dyn hocuspocus_core::Scaler>> = match &config.redis.url {
        Some(url) => {
            let mut redis_config = hocuspocus_redis::RedisConfiguration::new(url.clone());
            redis_config.prefix = config.redis.prefix.clone();
            redis_config.identifier = config.redis.identifier.clone();
            Some(Arc::new(
                hocuspocus_redis::RedisScaling::connect(redis_config).await?,
            ))
        }
        None => None,
    };
    let engine = Engine::with_parts(engine_config, Some(storage), authenticator, events, scaler);
    let state = AppState {
        engine: engine.clone(),
    };

    let app = Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route("/control/stats", get(control_stats))
        .route("/metrics", get(metrics))
        .route(
            "/control/close-connections",
            post(control_close_connections),
        )
        .route(
            "/control/broadcast-stateless",
            post(control_broadcast_stateless),
        )
        .route("/", get(root_or_upgrade))
        .route("/{*path}", get(root_or_upgrade))
        .with_state(state);

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

    // Graceful shutdown, mirroring destroy(): close clients so providers
    // reconnect elsewhere, then flush pending stores.
    engine
        .close_all_connections(close::RESET_CONNECTION.code, close::RESET_CONNECTION.reason)
        .await;
    engine.flush_all_documents().await;
    tracing::info!("shut down gracefully");
    Ok(())
}

/// The WebSocket endpoint accepts the upgrade on ANY path (document names
/// travel in-band); plain HTTP requests get the welcome text.
async fn root_or_upgrade(
    State(state): State<AppState>,
    request: axum::extract::Request,
) -> axum::response::Response {
    use axum::extract::FromRequestParts;
    let (mut parts, _body) = request.into_parts();
    match WebSocketUpgrade::from_request_parts(&mut parts, &()).await {
        Ok(upgrade) => upgrade
            .on_upgrade(move |socket| hocuspocus_axum::serve_socket(state.engine.clone(), socket)),
        Err(_) => hocuspocus_axum::WELCOME_MESSAGE.into_response(),
    }
}

/// Prometheus text exposition of the engine gauges.
async fn metrics(State(state): State<AppState>) -> ([(&'static str, &'static str); 1], String) {
    let body = format!(
        "# HELP hocuspocus_connections Established document connections.\n\
         # TYPE hocuspocus_connections gauge\n\
         hocuspocus_connections {}\n\
         # HELP hocuspocus_sockets Open WebSocket connections.\n\
         # TYPE hocuspocus_sockets gauge\n\
         hocuspocus_sockets {}\n\
         # HELP hocuspocus_documents Documents loaded in memory.\n\
         # TYPE hocuspocus_documents gauge\n\
         hocuspocus_documents {}\n",
        state.engine.connections_count(),
        state.engine.sockets_count(),
        state.engine.documents_count().await,
    );
    ([("Content-Type", "text/plain; version=0.0.4")], body)
}

async fn control_stats(State(state): State<AppState>) -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "connections": state.engine.connections_count(),
        "sockets": state.engine.sockets_count(),
        "documents": state.engine.documents_count().await,
    }))
}

#[derive(serde::Deserialize)]
struct BroadcastStatelessRequest {
    #[serde(rename = "documentName")]
    document_name: String,
    payload: String,
}

async fn control_broadcast_stateless(
    State(state): State<AppState>,
    axum::Json(request): axum::Json<BroadcastStatelessRequest>,
) -> &'static str {
    state
        .engine
        .broadcast_stateless(&request.document_name, request.payload)
        .await;
    "ok"
}

async fn control_close_connections(State(state): State<AppState>) -> &'static str {
    state
        .engine
        .close_all_connections(close::RESET_CONNECTION.code, close::RESET_CONNECTION.reason)
        .await;
    "ok"
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
