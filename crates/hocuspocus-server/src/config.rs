//! Configuration for the standalone server binary.
//!
//! Layered: defaults ← TOML file ← `HOCUSPOCUS_*` environment variables.
//! The file path comes from `--config <path>` or the `HOCUSPOCUS_CONFIG`
//! variable; without either, `hocuspocus.toml` is read if it exists.
//!
//! Time values are milliseconds, matching the TypeScript configuration
//!(`timeout: 60000`), so existing hocuspocus knowledge transfers 1:1.

use figment::providers::{Env, Format, Serialized, Toml};
use figment::Figment;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Config {
    pub server: ServerConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct ServerConfig {
    /// Address to bind, e.g. `127.0.0.1:1234`. Port 0 picks a free port
    /// (used by the conformance harness).
    pub listen: String,
    /// Instance name used in logs.
    pub name: Option<String>,
    /// Suppress the startup banner (logs still go through `tracing`).
    pub quiet: bool,
    /// Idle timeout in milliseconds (TS `timeout`).
    pub timeout_ms: u64,
    /// Store debounce in milliseconds (TS `debounce`).
    pub debounce_ms: u64,
    /// Maximum store debounce in milliseconds (TS `maxDebounce`).
    pub max_debounce_ms: u64,
    /// Persist and unload immediately on last disconnect (TS
    /// `unloadImmediately`).
    pub unload_immediately: bool,
}

impl Default for ServerConfig {
    fn default() -> Self {
        let engine = hocuspocus_core::Configuration::default();
        Self {
            listen: "0.0.0.0:1234".into(),
            name: None,
            quiet: false,
            timeout_ms: engine.timeout.as_millis() as u64,
            debounce_ms: engine.debounce.as_millis() as u64,
            max_debounce_ms: engine.max_debounce.as_millis() as u64,
            unload_immediately: engine.unload_immediately,
        }
    }
}

impl Config {
    /// Loads configuration from defaults, an optional TOML file and
    /// `HOCUSPOCUS_*` environment variables (e.g.
    /// `HOCUSPOCUS_SERVER_LISTEN=0.0.0.0:80`).
    // figment::Error is large by value; config loading runs once at startup,
    // so the copy is irrelevant.
    #[allow(clippy::result_large_err)]
    pub fn load(file: Option<&str>) -> Result<Self, figment::Error> {
        let mut figment = Figment::from(Serialized::defaults(Config::default()));
        if let Some(path) = file {
            figment = figment.merge(Toml::file_exact(path));
        } else {
            figment = figment.merge(Toml::file("hocuspocus.toml"));
        }
        figment
            .merge(Env::prefixed("HOCUSPOCUS_").split("_").lowercase(true))
            .extract()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_mirror_engine_configuration() {
        let config = Config::default();
        assert_eq!(config.server.timeout_ms, 60_000);
        assert_eq!(config.server.debounce_ms, 2_000);
        assert_eq!(config.server.max_debounce_ms, 10_000);
        assert!(config.server.unload_immediately);
    }
}
