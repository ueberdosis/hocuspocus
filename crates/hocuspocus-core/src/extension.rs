//! The extension/hook system — a 1:1 mapping of the TypeScript `Extension`
//! interface (`packages/server/src/types.ts`) onto one Rust trait.
//!
//! Semantics preserved from TypeScript:
//!
//! - Extensions run **sequentially**, sorted by [`Extension::priority`]
//!   descending (stable order for equal priorities; the Redis extension uses
//!   priority 1000 to run before persistence).
//! - A hook returning [`HookError::Abort`] stops the chain and propagates
//!   (e.g. an `on_authenticate` failure becomes PermissionDenied + close
//!   4401).
//! - [`HookError::SkipFurtherHooks`] (the TS `SkipFurtherHooksError`) stops
//!   the chain but is treated as success — "handled elsewhere", used by the
//!   Redis extension on store-lock contention.
//!
//! Where TypeScript hooks mutate the payload object or merge their return
//! value into `context`, the Rust payloads expose `&mut` fields instead.
//!
//! Hook ordering rules (which hooks run inline in the document actor vs
//! pipelined off it) are documented in `crates/PORTING.md`.

use async_trait::async_trait;
use bytes::Bytes;

use crate::context::Context;
use crate::document::Origin;
use crate::BoxError;
use hocuspocus_protocol::Scope;

/// Error type returned by hooks.
#[derive(Debug)]
pub enum HookError {
    /// Stop the chain, treat as success (TS `SkipFurtherHooksError`).
    SkipFurtherHooks(Option<String>),
    /// Abort the chain and propagate the error to the caller.
    Abort(BoxError),
}

impl<E> From<E> for HookError
where
    E: std::error::Error + Send + Sync + 'static,
{
    fn from(error: E) -> Self {
        Self::Abort(Box::new(error))
    }
}

pub type HookResult = Result<(), HookError>;

// ---------------------------------------------------------------------------
// Hook payloads (M0: core fields; grow as the engine lands in M2/M3).
// ---------------------------------------------------------------------------

/// Connection-scoped flags a hook may change (TS `connectionConfig`).
#[derive(Debug, Clone)]
pub struct ConnectionConfig {
    pub read_only: bool,
}

/// Shared fields for connection-scoped hooks.
#[derive(Debug)]
pub struct ConnectionInfo {
    pub document_name: String,
    pub session_id: Option<String>,
    pub socket_id: String,
    pub provider_version: Option<String>,
}

pub struct OnConnect<'a> {
    pub info: &'a ConnectionInfo,
    pub context: &'a mut Context,
    pub connection: &'a mut ConnectionConfig,
}

pub struct OnAuthenticate<'a> {
    pub info: &'a ConnectionInfo,
    pub token: &'a str,
    pub context: &'a mut Context,
    pub connection: &'a mut ConnectionConfig,
}

pub struct Connected<'a> {
    pub info: &'a ConnectionInfo,
    pub context: &'a Context,
    pub scope: Scope,
}

pub struct OnTokenSync<'a> {
    pub info: &'a ConnectionInfo,
    pub token: &'a str,
    pub context: &'a mut Context,
    pub connection: &'a mut ConnectionConfig,
}

pub struct OnDisconnect<'a> {
    pub info: &'a ConnectionInfo,
    pub context: &'a Context,
    pub clients_count: usize,
}

/// Mutable access to a document while it is exclusively held (during load,
/// or inside a direct transaction). Wraps the actor-owned `yrs::Doc`.
pub struct DocAccess<'a> {
    pub doc: &'a mut yrs::Doc,
}

pub struct OnCreateDocument<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
}

pub struct OnLoadDocument<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    pub doc: DocAccess<'a>,
}

pub struct AfterLoadDocument<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    pub doc: DocAccess<'a>,
}

pub struct BeforeHandleMessage<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    /// The raw inbound frame payload.
    pub payload: &'a Bytes,
}

pub struct AfterHandleMessage<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    pub payload: &'a Bytes,
}

pub struct BeforeSync<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    pub sync_type: hocuspocus_protocol::SyncMessageType,
    pub payload: &'a Bytes,
}

/// Awareness states decoded into mutable JSON, re-encoded after the chain —
/// preserves the TS mutate-to-rewrite contract without a scratch `Y.Doc`.
pub struct BeforeHandleAwareness<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    pub states: &'a mut std::collections::BTreeMap<u64, serde_json::Value>,
}

pub struct OnAwarenessUpdate<'a> {
    pub document_name: &'a str,
    pub added: &'a [u64],
    pub updated: &'a [u64],
    pub removed: &'a [u64],
}

pub struct OnStateless<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    pub payload: &'a str,
}

pub struct BeforeBroadcastStateless<'a> {
    pub document_name: &'a str,
    pub payload: &'a str,
}

pub struct OnChange<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    /// The incremental yjs update that was just applied.
    pub update: &'a Bytes,
    pub origin: &'a Origin,
    pub clients_count: usize,
}

pub struct OnStoreDocument<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    /// Full document state (`encode_state_as_update`), pre-encoded by the
    /// document actor so storage backends never touch the live document.
    pub state: &'a Bytes,
    pub origin: &'a Origin,
    pub clients_count: usize,
}

pub struct AfterStoreDocument<'a> {
    pub document_name: &'a str,
    pub context: &'a Context,
    pub state: &'a Bytes,
    pub clients_count: usize,
}

pub struct BeforeUnloadDocument<'a> {
    pub document_name: &'a str,
    pub clients_count: usize,
}

pub struct AfterUnloadDocument<'a> {
    pub document_name: &'a str,
}

pub struct OnConfigure<'a> {
    pub configuration: &'a crate::Configuration,
}

pub struct OnListen {
    pub port: u16,
}

pub struct OnRequest<'a> {
    pub path: &'a str,
}

pub struct OnUpgrade<'a> {
    pub path: &'a str,
}

pub struct OnDestroy {}

// ---------------------------------------------------------------------------
// The Extension trait: all 25 hooks, default no-ops.
// ---------------------------------------------------------------------------

/// A Hocuspocus extension. Mirrors the TS `Extension` interface hook for
/// hook; every method defaults to a no-op so implementors override only
/// what they need.
#[allow(unused_variables)]
#[async_trait]
pub trait Extension: Send + Sync + 'static {
    /// Extension name for logging and diagnostics.
    fn name(&self) -> &str;

    /// Higher priority runs first (default 100, Redis uses 1000) — matches
    /// the TS extension sort.
    fn priority(&self) -> i32 {
        100
    }

    // Lifecycle ------------------------------------------------------------
    async fn on_configure(&self, payload: &mut OnConfigure<'_>) -> HookResult {
        Ok(())
    }
    async fn on_listen(&self, payload: &mut OnListen) -> HookResult {
        Ok(())
    }
    async fn on_upgrade(&self, payload: &mut OnUpgrade<'_>) -> HookResult {
        Ok(())
    }
    async fn on_request(&self, payload: &mut OnRequest<'_>) -> HookResult {
        Ok(())
    }
    async fn on_destroy(&self, payload: &mut OnDestroy) -> HookResult {
        Ok(())
    }

    // Connection setup -----------------------------------------------------
    async fn on_connect(&self, payload: &mut OnConnect<'_>) -> HookResult {
        Ok(())
    }
    async fn on_authenticate(&self, payload: &mut OnAuthenticate<'_>) -> HookResult {
        Ok(())
    }
    async fn connected(&self, payload: &mut Connected<'_>) -> HookResult {
        Ok(())
    }
    async fn on_token_sync(&self, payload: &mut OnTokenSync<'_>) -> HookResult {
        Ok(())
    }

    // Document load --------------------------------------------------------
    async fn on_create_document(&self, payload: &mut OnCreateDocument<'_>) -> HookResult {
        Ok(())
    }
    async fn on_load_document(&self, payload: &mut OnLoadDocument<'_>) -> HookResult {
        Ok(())
    }
    async fn after_load_document(&self, payload: &mut AfterLoadDocument<'_>) -> HookResult {
        Ok(())
    }

    // Message handling -----------------------------------------------------
    async fn before_handle_message(&self, payload: &mut BeforeHandleMessage<'_>) -> HookResult {
        Ok(())
    }
    async fn after_handle_message(&self, payload: &mut AfterHandleMessage<'_>) -> HookResult {
        Ok(())
    }
    async fn before_sync(&self, payload: &mut BeforeSync<'_>) -> HookResult {
        Ok(())
    }
    async fn before_handle_awareness(&self, payload: &mut BeforeHandleAwareness<'_>) -> HookResult {
        Ok(())
    }
    async fn on_awareness_update(&self, payload: &mut OnAwarenessUpdate<'_>) -> HookResult {
        Ok(())
    }
    async fn on_stateless(&self, payload: &mut OnStateless<'_>) -> HookResult {
        Ok(())
    }
    async fn before_broadcast_stateless(
        &self,
        payload: &mut BeforeBroadcastStateless<'_>,
    ) -> HookResult {
        Ok(())
    }

    // Change / persistence ---------------------------------------------------
    async fn on_change(&self, payload: &mut OnChange<'_>) -> HookResult {
        Ok(())
    }
    async fn on_store_document(&self, payload: &mut OnStoreDocument<'_>) -> HookResult {
        Ok(())
    }
    async fn after_store_document(&self, payload: &mut AfterStoreDocument<'_>) -> HookResult {
        Ok(())
    }

    // Teardown ---------------------------------------------------------------
    async fn on_disconnect(&self, payload: &mut OnDisconnect<'_>) -> HookResult {
        Ok(())
    }
    async fn before_unload_document(&self, payload: &mut BeforeUnloadDocument<'_>) -> HookResult {
        Ok(())
    }
    async fn after_unload_document(&self, payload: &mut AfterUnloadDocument<'_>) -> HookResult {
        Ok(())
    }
}

/// An ordered chain of extensions.
pub struct HookChain {
    extensions: Vec<Box<dyn Extension>>,
}

impl HookChain {
    /// Sorts extensions by priority descending; equal priorities keep their
    /// registration order (matches the TS stable sort in `configure()`).
    pub fn new(mut extensions: Vec<Box<dyn Extension>>) -> Self {
        extensions.sort_by_key(|extension| std::cmp::Reverse(extension.priority()));
        Self { extensions }
    }

    pub fn extensions(&self) -> impl Iterator<Item = &dyn Extension> {
        self.extensions.iter().map(AsRef::as_ref)
    }

    /// Runs one hook across the chain with the shared semantics:
    /// sequential, `SkipFurtherHooks` → early `Ok`, `Abort` → `Err`.
    ///
    /// Usage: `chain.run(&mut payload, |ext, p| ext.on_connect(p)).await`.
    pub async fn run<'p, P, F>(&self, payload: &'p mut P, mut hook: F) -> Result<(), BoxError>
    where
        P: Send,
        F: for<'a> FnMut(
            &'a dyn Extension,
            &'a mut P,
        ) -> futures::future::BoxFuture<'a, HookResult>,
    {
        for extension in &self.extensions {
            match hook(extension.as_ref(), payload).await {
                Ok(()) => {}
                Err(HookError::SkipFurtherHooks(_)) => return Ok(()),
                Err(HookError::Abort(error)) => return Err(error),
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    struct Recorder {
        name: &'static str,
        priority: i32,
        calls: Arc<AtomicUsize>,
        result: fn() -> HookResult,
    }

    #[async_trait]
    impl Extension for Recorder {
        fn name(&self) -> &str {
            self.name
        }
        fn priority(&self) -> i32 {
            self.priority
        }
        async fn on_listen(&self, _payload: &mut OnListen) -> HookResult {
            self.calls.fetch_add(1, Ordering::SeqCst);
            (self.result)()
        }
    }

    fn recorder(
        name: &'static str,
        priority: i32,
        calls: &Arc<AtomicUsize>,
        result: fn() -> HookResult,
    ) -> Box<dyn Extension> {
        Box::new(Recorder {
            name,
            priority,
            calls: calls.clone(),
            result,
        })
    }

    #[tokio::test]
    async fn priority_orders_descending() {
        let calls = Arc::new(AtomicUsize::new(0));
        let chain = HookChain::new(vec![
            recorder("low", 10, &calls, || Ok(())),
            recorder("high", 1000, &calls, || Ok(())),
        ]);
        let names: Vec<_> = chain.extensions().map(|e| e.name().to_owned()).collect();
        assert_eq!(names, ["high", "low"]);
    }

    #[tokio::test]
    async fn skip_further_hooks_is_success() {
        let calls = Arc::new(AtomicUsize::new(0));
        let chain = HookChain::new(vec![
            recorder("skips", 200, &calls, || {
                Err(HookError::SkipFurtherHooks(None))
            }),
            recorder("never-runs", 100, &calls, || Ok(())),
        ]);
        let mut payload = OnListen { port: 0 };
        let result = chain
            .run(&mut payload, |ext, p| Box::pin(ext.on_listen(p)))
            .await;
        assert!(result.is_ok());
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn abort_propagates() {
        let calls = Arc::new(AtomicUsize::new(0));
        let chain = HookChain::new(vec![
            recorder("aborts", 200, &calls, || {
                Err(HookError::Abort("permission denied".into()))
            }),
            recorder("never-runs", 100, &calls, || Ok(())),
        ]);
        let mut payload = OnListen { port: 0 };
        let result = chain
            .run(&mut payload, |ext, p| Box::pin(ext.on_listen(p)))
            .await;
        assert!(result.is_err());
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }
}
