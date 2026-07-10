//! Per-connection context, the Rust equivalent of the freeform mutable
//! `context` object that TypeScript hooks read and extend.

use std::any::{Any, TypeId};
use std::collections::HashMap;

/// Context that flows from `onConnect`/`onAuthenticate` into every later
/// hook payload of the same connection.
///
/// The JSON half is what the standalone binary round-trips through webhook
/// calls (an auth webhook returns `context` JSON that reappears in later
/// events). The typed half is for embedded Rust extensions that want to
/// stash their own state without stringly-typed keys.
#[derive(Debug, Default)]
pub struct Context {
    /// JSON-shaped data, serialized into webhook event payloads.
    pub data: serde_json::Map<String, serde_json::Value>,
    typed: HashMap<TypeId, Box<dyn Any + Send + Sync>>,
}

impl Context {
    pub fn new() -> Self {
        Self::default()
    }

    /// Merges JSON fields into the context (the TS "return value merges
    /// into context" hook contract, made explicit).
    pub fn merge_data(&mut self, additions: serde_json::Map<String, serde_json::Value>) {
        self.data.extend(additions);
    }

    /// Stores a typed value, replacing any previous value of the same type.
    pub fn insert<T: Any + Send + Sync>(&mut self, value: T) -> Option<T> {
        self.typed
            .insert(TypeId::of::<T>(), Box::new(value))
            .and_then(|old| old.downcast().ok())
            .map(|boxed| *boxed)
    }

    pub fn get<T: Any + Send + Sync>(&self) -> Option<&T> {
        self.typed
            .get(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_ref())
    }

    pub fn get_mut<T: Any + Send + Sync>(&mut self) -> Option<&mut T> {
        self.typed
            .get_mut(&TypeId::of::<T>())
            .and_then(|boxed| boxed.downcast_mut())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, PartialEq)]
    struct TenantId(u64);

    #[test]
    fn typed_storage() {
        let mut context = Context::new();
        assert!(context.get::<TenantId>().is_none());
        context.insert(TenantId(7));
        assert_eq!(context.get::<TenantId>(), Some(&TenantId(7)));
        assert_eq!(context.insert(TenantId(8)), Some(TenantId(7)));
    }

    #[test]
    fn json_merge() {
        let mut context = Context::new();
        let mut additions = serde_json::Map::new();
        additions.insert("user".into(), serde_json::json!({"id": 1}));
        context.merge_data(additions);
        assert_eq!(context.data["user"]["id"], 1);
    }
}
