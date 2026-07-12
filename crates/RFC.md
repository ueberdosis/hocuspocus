# RFC 0001: Hocuspocus in Rust

**Status:** Draft · **Scope:** Full rewrite of the Hocuspocus server in Rust

## 1. Motivation

Hocuspocus runs every CPU-heavy Yjs operation synchronously on the Node.js
main thread. Under production load this blocks the event loop — heartbeats,
new connections and unrelated documents all stall behind one large document.
Verified hot spots in the current codebase:

| Operation | Where | Cost driver |
|---|---|---|
| `Y.applyUpdate` / `readSyncStep2` | `packages/server/src/MessageReceiver.ts` (sync handling) | every inbound update |
| `Y.encodeStateAsUpdate` (full state) | `packages/extension-database/src/Database.ts`, `Hocuspocus.loadDocument` | every debounced store; proportional to document size |
| state-vector diff + encode (`writeSyncStep1`/`readSyncStep1`) | initial sync in `MessageReceiver.ts` | every new connection |
| `Y.snapshot` + `Y.snapshotContainsUpdate` | `MessageReceiver.ts` read-only ack path | every read-only SyncStep2/Update frame |
| awareness decode → scratch `Y.Doc` → re-encode | `MessageReceiver.ts` | every awareness frame |
| broadcast fan-out (`OutgoingMessage` per connection, sync send loop) | `packages/server/src/Document.ts` | every update × every connection |

No work is offloaded to worker threads anywhere in the server. The fix is a
rewrite in Rust on top of [yrs](https://github.com/y-crdt/y-crdt) (the Rust
port of Yjs, binary-compatible with the yjs update format), with per-document
parallelism across cores.

**Guiding principle** (the central learning from Bun's Zig→Rust port): *the
existing test suite is the product spec.* The TypeScript provider and its
~300 e2e tests define correctness; the Rust server must be indistinguishable
to `@hocuspocus/provider` clients and to Node hocuspocus instances sharing a
Redis channel. Where we preserve hocuspocus's architecture (hook chain
semantics, debounce/save-mutex behavior, Redis framing) versus where we go
idiomatic Rust (actors instead of a shared event loop) is decided explicitly,
per section, in this document and in [PORTING.md](./PORTING.md).

## 2. Decisions (fixed)

1. **Deployment model:** a standalone server binary (`hocuspocus-server`,
   configured via TOML + env, integrating with the user's application through
   HTTP webhooks) *plus* an embeddable Rust library (`hocuspocus-core`) with
   trait-based extensions.
2. **Protocol:** 100 % wire-compatible with the existing
   `@hocuspocus/provider`. No client changes, ever, in v1.
3. **v1 scope:** Redis horizontal scaling (byte-interoperable with
   `@hocuspocus/extension-redis`), database persistence (SQLite, Postgres,
   S3), webhook auth/persistence/events, Prometheus metrics + tracing.
4. **Not in scope:** the TS client packages (`provider`, `provider-react`),
   `@hocuspocus/transformer` (see § 10), CLI/playground packages.

## 3. Workspace layout

```
crates/
  hocuspocus-protocol/   wire format only; sync, no I/O, no tokio — fuzzable,
                         golden-testable, reused by the Redis crate
  hocuspocus-core/       embeddable engine: documents, connections, hooks,
                         debounce/store, context — transport-agnostic
  hocuspocus-axum/       axum/WebSocket transport adapter
                         (mirrors Server.ts wrapping Hocuspocus.ts)
  hocuspocus-redis/      pub/sub relay + store lock, Node-interoperable
  hocuspocus-storage/    Storage impls behind features: sqlite|postgres (sqlx),
                         s3 (object_store); InMemoryStorage always available
  hocuspocus-webhook/    HTTP webhook auth + persistence + events
  hocuspocus-metrics/    metrics facade + Prometheus exporter, tracing
  hocuspocus-server/     the standalone binary: config, wiring, health,
                         graceful shutdown
```

Dependency flow: `server → {axum, redis, storage, webhook, metrics} → core →
protocol → yrs, bytes`. Heavy dependencies (redis client, HTTP client,
exporter) live in leaf crates so embedders can omit them entirely.

## 4. Concurrency model

**One tokio task per loaded document, exclusively owning the `yrs::Doc` and
its `Awareness`. All mutation flows through a bounded per-document mailbox
(`mpsc::Sender<DocMessage>`). No locks on document state.**

Today, hocuspocus's correctness is implicitly guaranteed by Node's single
thread: every document mutation, hook side effect and broadcast is
serialized. The actor preserves exactly that serialization *per document*
while different documents run on different cores — which is precisely the
scaling failure being fixed.

Rejected alternative — `RwLock<yrs::Doc>`: `yrs::TransactionMut` requires
exclusive access anyway (reads don't meaningfully parallelize within one
document), holding a lock across `.await` points (hook calls) invites
deadlocks, and FIFO mailbox fairness under contention is better.

Key types (skeletons in `hocuspocus-core/src/document.rs`): `DocHandle`,
`DocMessage::{Join, Leave, ApplySync, ApplyAwareness, QueryAwareness,
Stateless, BroadcastStateless, DirectTransact, EncodeStateAsUpdate,
FlushStoreNow, Shutdown}`, `DocRegistry`/`DocSlot`.

### Broadcast fan-out

Encode each outbound frame **once** per (document, address variant) into
`bytes::Bytes`, then refcount-clone it into each subscriber's bounded
`mpsc::Sender<Bytes>`. Connections using the plain document name (the common
case) share one buffer; session-multiplexed connections get one buffer per
distinct raw address, since the envelope embeds the connection's routing key.

`tokio::sync::broadcast` was rejected: its lagging behavior drops the oldest
messages silently, and a dropped `Update` frame means a permanently diverged
client until the next full resync.

### Slow clients

Node's `ws` buffers outbound data without limit (an OOM vector today). We
bound it: each connection has a configurable outbound byte budget (default
16 MiB). On overflow the connection is closed with **4205 Reset Connection**
— the provider reconnects automatically and performs a fresh SyncStep1,
which is self-healing. This is a deliberate, documented behavioral
difference; a counter metric and a warning log fire before the close.

### CPU-bound operations

yrs is one to two orders of magnitude faster than yjs on the hot paths, so
document operations run **inline in the actor task** on the shared runtime:
a slow `encode_state_as_update` blocks only its own document, not the
process. Escape hatch for pathological deployments: a config option to run
document actors on a dedicated second runtime so socket I/O latency
(ping/pong deadlines) is never affected by document CPU. No rayon — a CRDT
apply has no intra-document parallelism to exploit.

### Document lifecycle

`DocRegistry` maps names to `DocSlot::{Loading, Ready, Unloading}` where
Loading/Unloading hold `Shared` futures:

- concurrent loads await the same shared future (TS `loadingDocuments`),
- a load requested while unloading awaits the unload, then retries fresh
  (TS `unloadingDocuments` — the reconnect-during-teardown race),
- the registry mutex is a plain `std::sync::Mutex`, never held across await.

Load order: `on_create_document` → construct `yrs::Doc` → `on_load_document`
(storage fetch + apply inside the new actor, before it accepts traffic) →
`after_load_document`. Unload trigger: the actor observes zero subscribers
and zero direct connections → `before_unload_document` hooks (the Redis
extension sleeps its disconnect delay here) → **re-check emptiness** (a
connection may have joined during the delay; abort the unload if so, exactly
like TS) → final store flush → drop actor → `after_unload_document`.

### Debounced store

Reproduces `useDebounce` + `saveMutex` semantics
(`packages/server/src/Hocuspocus.ts`, `util/debounce.ts`):

- Dirty state per document: `dirty_since` (first unsaved change — the
  `max_debounce` anchor), `last_change` (the `debounce` anchor),
  `last_origin`, `skip_store`.
- The actor timer fires at `min(last_change + debounce, dirty_since +
  max_debounce)` — a store happens at least every `max_debounce` (10 s
  default) while changes keep arriving.
- On fire, the actor encodes the full state inline (the only doc-blocking
  part), then spawns the store task: acquire `save_lock`
  (= `saveMutex.runExclusive`, also contended by the final unload flush),
  run `on_store_document` → `after_store_document`.
- `SkipFurtherHooks` from the Redis store lock → the store is skipped
  silently (another instance persisted), matching today.
- Redis-originated changes never schedule stores (`Origin::skips_store_hooks`).

### Connection model

Mirrors `ClientConnection` → per-document `Connection`:

- **Reader task** per socket: parse frame → bare Ping/Pong handled at socket
  level → resolve the document address → pre-auth state machine → route to
  the document actor. Pre-auth limits are exactly TS
  (GHSA-xwhh-v746-pj9m): ≤ 5 MiB and ≤ 1000 queued messages across all
  unauthenticated queues, ≤ 100 pending documents, and an **absolute**
  pre-auth deadline armed at socket open that inbound frames must NOT
  refresh. After authentication, an idle timeout (default 60 s) refreshed by
  any inbound frame.
- **Writer task** per socket: drains the bounded outbound queue into the
  WebSocket sink, sends server pings on the timeout interval.

## 5. Extension / hook system

One `#[async_trait] trait Extension` with all 25 hooks as default no-op
methods (`hocuspocus-core/src/extension.rs`) — a 1:1 mapping of the TS
`Extension` interface, so porting extensions and reasoning about hook order
stays trivial. Extensions run sequentially, sorted by `priority()`
descending with stable registration order (Redis = 1000, default = 100).

Error semantics:

- `HookError::Abort` stops the chain and propagates (an `on_authenticate`
  failure becomes `PermissionDenied` + close 4401).
- `HookError::SkipFurtherHooks` (TS `SkipFurtherHooksError`) stops the chain
  but is treated as success — "handled elsewhere".

Where TS hooks mutate payload objects or merge return values into `context`,
Rust payloads expose `&mut` fields: `OnAuthenticate { connection: &mut
ConnectionConfig, context: &mut Context, … }`, `OnLoadDocument { doc:
DocAccess<'_>, … }` (runs inside the actor before it accepts traffic),
`BeforeHandleAwareness { states: &mut BTreeMap<u64, serde_json::Value> }`
(decoded, hook-mutated, re-encoded — the TS scratch-doc contract without the
scratch doc).

`Context` carries a JSON half (`serde_json::Map`, round-tripped through
webhook calls) and a typed half (anymap for embedded Rust extensions).

Convenience traits adapted into the hook chain, mirroring
`extension-database`:

- `trait Storage { fetch, store }` (`hocuspocus-core/src/storage.rs`)
- `trait Authenticator { authenticate → AuthDecision { scope, context } }`
  (`hocuspocus-core/src/auth.rs`)

## 6. Wire protocol invariants (appendix A)

Everything in this section is byte-exact and conformance-tested. Codecs live
in `hocuspocus-protocol` with golden vectors.

**Envelope:** `[lib0 varString address][lib0 varUint type][payload]`.
The address is the document name or `documentName + "\0" + sessionId`
(session-aware multiplexing; `packages/common/src/routingKey.ts`). Replies
echo the connection's **raw** address, never the bare name.

**Message types** (`packages/server/src/types.ts`):

| # | Type | Payload |
|---|---|---|
| 0 | Sync | y-protocols sync message (see below) |
| 1 | Awareness | varUint8Array awareness update |
| 2 | Auth | auth sub-message (see below) |
| 3 | QueryAwareness | — |
| 4 | SyncReply | like Sync, but receiver must not answer with its own SyncStep1 |
| 5 | Stateless | varString |
| 6 | BroadcastStateless | varString — server-internal; **reject from clients** |
| 7 | CLOSE | varString reason |
| 8 | SyncStatus | varUint 1/0 — "was the update applied/persisted" |
| 9 | Ping | **bare 1-byte frame `[0x09]`, no address** |
| 10 | Pong | **bare 1-byte frame `[0x0A]`, no address** |

**Sync sub-types** (y-protocols): Step1 = 0 (state vector), Step2 = 1
(update diff), Update = 2. On a client SyncStep1 the server replies
SyncStep2 **then its own SyncStep1**. After applying Step2/Update the server
sends SyncStatus(1). Read-only connections do not apply updates: Step2/Update
are acked via a snapshot-containment check (SyncStatus 1/0) without mutating
the document.

**Auth sub-types** (`packages/common/src/auth.ts`): Token = 0,
PermissionDenied = 1 (+ varString reason), Authenticated = 2 (+ varString
scope, exactly `"readonly"` or `"read-write"`). Client → server Token
carries `varString token` plus an **optional trailing** `varString
providerVersion` — read only if bytes remain; old providers omit it.
Server → client Token is bare (a token re-sync request, drives
`onTokenSync`).

**Close codes** (`packages/common/src/CloseEvents.ts`): 1009 Message Too
Big, 4205 Reset Connection, 4401 Unauthorized, 4403 Forbidden, 4408
Connection Timeout. Codes *and reason strings* must match.

**Auth gating:** frames for a document arriving before that document is
authenticated are queued (bounded, see § 4); an Auth frame triggers
`onConnect` → `onAuthenticate`, then `Authenticated` + the queued frames are
drained into the normal pipeline.

## 7. Redis interop (appendix B)

Byte-compatible with `packages/extension-redis/src/Redis.ts` so Node and
Rust instances can share one Redis during migration:

- **Channel:** `{prefix}:{documentName}`, default prefix `hocuspocus`.
- **Frame:** `[u8 identifierLength][identifier utf8][hocuspocus wire
  message]`. The identifier (default `host-{uuid}`, ≤ 255 UTF-8 bytes) lets
  an instance drop its own echoes. Codec: `hocuspocus_protocol::redis`.
- **Bootstrap on document load:** subscribe, publish SyncStep1, publish
  QueryAwareness — pulls state and presence from peer instances.
- **onChange** (non-Redis origin): publish SyncStep1 to peers. Incoming
  Redis messages are applied with `Origin::Redis`, whose replies go back to
  the channel and which **never schedules stores** (no double persistence).
- **Store lock:** try-once lock on `{prefix}:{documentName}:lock`, TTL 1 s
  (`SET key value NX PX ttl`; release via compare-and-delete Lua). Lock
  contention → `SkipFurtherHooks` → this instance skips the store. Same key
  names, TTL and semantics as the Node Redlock usage, so a mixed fleet
  coordinates correctly — this is the single riskiest interop detail and
  gets dedicated three-topology tests (Node↔Node, Rust↔Rust, Node↔Rust).
- **Disconnect delay:** 1 s pause in `before_unload_document` +
  the re-check-emptiness rule (§ 4).

Client crate: fred (automatic reconnect **with pub/sub re-subscription** —
a silently dropped subscription partitions a document across the fleet).

## 8. Webhook contract v1

Two channels, because document state is binary and base64-in-JSON at
document scale is the wrong tool:

**Binary persistence endpoints** (when storage is delegated to the app):

- `GET {base}/documents/{name}` → `200` + `application/octet-stream`
  (yjs update v1, full state) or `404` (new document).
- `PUT {base}/documents/{name}`, body = full state update → `2xx`.
- Both carry `X-Hocuspocus-Context: <json>` (when non-empty): the auth
  context of the connection that triggered the load / whose change
  scheduled the store — the TS `onLoadDocument`/`onStoreDocument`
  `context` payload field.

**JSON event endpoint:** `POST {base}` with `{"event": "...", "payload":
{...}}`. Signature header `X-Hocuspocus-Signature-256: sha256=<hmac-sha256
hex>` over the raw body — byte-compatible with
`@hocuspocus/extension-webhook`, so existing app-side verification code
keeps working (`hocuspocus_webhook::sign`).

Events:

- `auth` — payload `{documentName, token, requestHeaders, requestParameters,
  socketId, providerVersion}`; response `200 {"context": {...}, "scope":
  "read-write"|"readonly"}` or `403 {"reason": "..."}` → PermissionDenied +
  close 4403.
- `connect` — awaited before `auth`; non-2xx rejects the connection, and
  the response's `{"context": {...}}` merges into the connection context
  *under* the auth response's keys (TS order: onConnect first,
  onAuthenticate on top).
- `disconnect` / `create` — parity with the Node extension; `disconnect`
  payload carries the connection's `context`.
- `change` — debounced with the store; payload carries the incremental
  update (base64 — bounded, it is a delta) and the `context` of the
  connection whose change scheduled it.
- `stateless` — payload `{documentName, payload, context}`; the response's
  optional `{"respond": "..."}` is sent back to the originating
  connection.

## 9. Standalone binary

- **Config:** TOML file (`--config` / `HOCUSPOCUS_CONFIG` /
  `./hocuspocus.toml`) layered under `HOCUSPOCUS_*` env vars (figment).
  Defaults mirror the TS `defaultConfiguration` exactly: timeout 60 000 ms,
  debounce 2 000 ms, maxDebounce 10 000 ms, unloadImmediately true, queue
  limits 5 MiB / 1000 / 100.
- **Endpoints:** WebSocket upgrade, `/` ("Welcome to Hocuspocus!"),
  `/healthz` (liveness), `/readyz` (Redis + storage connectivity),
  `/metrics` (separate listener), control API (`/control/stats`,
  `/control/close-connections`) used by operators *and* the conformance
  harness.
- **Readiness line:** the first stdout line is JSON
  (`{"name":…,"address":…,"port":…}`) so harnesses can start the binary
  with port 0 and read the real port.
- **Graceful shutdown** (SIGTERM/SIGINT), matching `destroy()`:
  stop accepting upgrades + fail `/readyz` → close every client with 4205
  (providers reconnect to healthy replicas) → `FlushStoreNow` per document,
  awaiting `save_lock` → unload all documents → `on_destroy` hooks. Hard
  deadline 30 s.

## 10. What is not rewritten

- **`@hocuspocus/provider` / `provider-react`:** untouched. This repo stays
  the home of the client packages and the conformance suite.
- **`@hocuspocus/transformer`:** there is no faithful Rust y-prosemirror.
  **No embedded JS runtime in v1.** Webhook change events carry the raw yjs
  update (base64) and/or generic JSON via yrs's `ToJson` — structurally
  useful, but not ProseMirror JSON. Apps that need Tiptap/ProseMirror JSON
  apply the update in their own process with the existing transformer (a
  documented ~30-line "transformer sidecar" Node example ships with M3).
  Embedding QuickJS/V8 remains a v2 option if demand materializes.
- **CLI / playground packages:** superseded by the binary.

## 11. Conformance testing

The production webhook contract doubles as the hook transport for tests; a
small control API covers the rest; genuinely in-process tests get Rust-native
equivalents.

- `tests/utils/newHocuspocus.ts` becomes a dispatcher keyed on
  `HOCUSPOCUS_TEST_TARGET=node|rust` (default `node`; the existing suite is
  untouched by default).
- `newHocuspocusRust()` starts a per-test HTTP hook receiver in the TS test
  process that dispatches the Rust server's webhook calls to the same inline
  JS closures tests already pass, spawns the prebuilt binary with port 0,
  reads the ready line, and returns a handle exposing `webSocketURL`,
  `closeConnections()`, `getConnectionsCount()`, `getDocumentsCount()` via
  the control API.
- A committed `tests/conformance/skip-map.json` lists non-applicable tests
  with reason codes; the Rust-target run prints "N applicable, M passing" —
  the headline metric per milestone.

Census of the ~304 existing tests: **Tier 1 pure-wire** (~38 %:
`tests/provider/*`, `tests/providerwebsocket/*`, wire-observable server
tests) runs unmodified; **Tier 2 hook-via-webhook** (~32 %: onAuthenticate /
onLoadDocument / onStoreDocument / onChange / debounce / database fetch)
runs via the webhook receiver; **Tier 3** (~30 %: TS extension mechanics,
in-process interceptors, DirectConnection, logger/throttle/transformer)
becomes Rust-native tests or stays TS-only. Net: ~70 % of the suite becomes
the executable conformance suite.

Beyond the ported suite:

1. **Fixture extraction (M1):** a recording mode in the TS harness dumps
   every WS frame during a normal AVA run into committed fixtures; the
   protocol crate must parse all inbound frames and byte-match
   deterministic outbound re-encodings.
2. **Differential driver (M2+, nightly):** identical seeded random session
   scripts against a Node and a Rust server; compare final
   `encodeStateAsUpdate`, close codes, and hook invocation multisets;
   shrink failures by seed. Document equality is asserted via state
   vectors/content — **never** update-byte equality (yrs merge timing may
   differ legally).
3. **cargo-fuzz + proptest (M1–M2):** fuzz the frame decoder and sync state
   machine seeded with the fixture corpus; property-test the hocuspocus
   framing layer (yrs↔yjs CRDT encoding is covered upstream in y-crdt).

## 11.5 Measured: the main-thread coupling, eliminated

`tests/conformance/bench-latency.mts` measures the failure mode that
motivated this rewrite: edit-propagation latency on a small document while
peer processes hammer a LARGE document (8 M chars) with fresh initial
syncs — each forcing a full-state encode server-side.

| probe latency (separate small doc) | Node server | Rust server |
|---|---|---|
| baseline p50 / p99 | 2 ms / 4 ms | 1 ms / 2 ms |
| under sync-storm p50 | **33 ms** | **1 ms** |
| under sync-storm p95 | 97 ms | 8 ms |
| under sync-storm p99 | 116 ms | 12 ms |
| big-doc syncs served (12 s) | 368 | **648 (+76 %)** |

(16-core container, release build, 4 loader processes × 2 connections.)
Node's single thread couples every document to the busiest one; the
per-document actors do not — the probe's median latency is unchanged under
load while the Rust server also serves 76 % more initial syncs.

## 12. Migration & rollout

- **Distribution:** npm (`@hocuspocus/server-rust` shim +
  `optionalDependencies` platform binary packages, the esbuild/Bun pattern),
  Docker image, GitHub release binaries.
- **Mixed fleet:** the Redis framing + lock interop (§ 7) is the contract.
  CI gate: `tests/extension-redis/*` green in Node↔Node, Rust↔Rust **and
  Node↔Rust** topologies.
- **Shadow phase:** one Rust instance joins the production Redis and
  persists to a shadow table; a comparator asserts state-vector equality
  against Node-persisted documents. Zero user impact.
- **Canary per instance** behind the LB (instances converge via Redis).
- **Fallback:** the persistence format is unchanged (raw yjs update v1 in
  the same store/row/object shape), so rollback = LB weight to zero. No
  data migration in either direction.

## 13. Milestones

| Milestone | Status | Scope | Exit criteria |
|---|---|---|---|
| **M0** | ✅ done | RFC + PORTING.md, compiling 8-crate scaffold, binary with ready-line + `/healthz`, Rust CI | cargo build/test/clippy/fmt green in CI |
| **M1** | ✅ done | protocol crate complete: sync steps over yrs, awareness codec, TS-generated fixture corpus, fuzz targets | 100 % fixtures parse; byte-exact re-encode where deterministic (24/24); fuzz smoke ~22M execs clean (1 h soak pending CI) |
| **M2** | ✅ done | single-node sync server: WS, doc lifecycle, sync/awareness broadcast, stateless, auth handshake, close codes, control API; test dispatcher + skip-map | Tier-1 conformance: ALL of tests/provider + tests/providerwebsocket pass (18 files / 62 tests); conformance job in CI |
| **M3** | ✅ done | webhook auth + load/store + all five events (auth/connect/disconnect/change/stateless); memory/sqlite/postgres/s3 backends; debounced store with fail-safe unload | Tier-2 conformance green (28 files / 97 tests incl. partial files); webhook smokes committed |
| **M4** | ✅ done | Redis multi-node: relay, Node-compatible store lock, ConnectionManager auto-reconnect with re-subscription, publish retry | four-topology smoke green against real Redis (Rust↔Rust, Node↔Rust both ways, restart resilience); extension-redis AVA suite in the conformance run |
| **M5** | metrics, limits, graceful shutdown, differential nightly, load tests | 24 h soak clean; published perf comparison vs Node |
| **M6** | npm platform packages, Docker, release workflow, migration guide | install smoke test on all platforms; parity checklist signed off |

## 14. Key crate choices

| Concern | Choice | Why |
|---|---|---|
| CRDT | **yrs** | the y-crdt Rust port; yjs update-v1 binary compatible; includes sync protocol + awareness. Non-negotiable. |
| Runtime | **tokio** (multi-thread) | explicit decision: greenfield network server with no legacy callback architecture to preserve (Bun's reason to avoid tokio does not apply here); the ecosystem assumes it |
| HTTP/WS | **axum** | HTTP is needed anyway (health, metrics, webhooks, upgrade hooks); clean embedding story |
| TLS | **rustls** everywhere | no OpenSSL build/deploy pain; static musl binaries |
| Redis | **fred** | auto-reconnect with pub/sub re-subscription; store lock hand-rolled (~40 lines, `SET NX PX` + compare-and-delete Lua) for Node interop |
| SQL | **sqlx** (`postgres`, `sqlite`) | one async API for both backends |
| S3 | **object_store** | one-blob-per-doc get/put is its sweet spot; GCS/Azure/MinIO for free |
| Observability | **tracing** (+ OpenTelemetry), **metrics** facade + Prometheus exporter | embedders may bring their own exporter |
| Throttling | **governor** | extension-throttle parity |
| Misc | async-trait, bytes, thiserror, figment, hmac + sha2, serde | — |

## 15. Risks

1. **yrs ↔ yjs behavioral drift.** GC/merge timing means updates may be
   byte-different yet semantically equal — conformance asserts document
   equality, never update-byte equality. The `Y.snapshotContainsUpdate`
   equivalent in yrs is spike task #1 (fallback: a state-vector-coverage
   check reproducing the observable read-only SyncStatus ack). Awareness
   30 s timeout / null-state-removal fidelity via golden vectors.
2. **Protocol edge cases** — each has a dedicated conformance test: the
   optional trailing providerVersion, `\0` session-address echo, SyncReply
   suppression, bare vs enveloped Ping/Pong, BroadcastStateless rejection,
   pre-auth accounting + non-refreshable deadline, CLOSE semantics.
3. **Mixed-fleet store thrash:** Node and Rust instances alternately winning
   the store lock is safe (same full-state upsert), but both sides must
   write identical rows/objects — verified by shared-database tests.
4. **Backpressure change** (§ 4 slow clients): generous default, metric +
   warn before close, configurable.
5. **Hook-order fidelity:** the inline vs pipelined hook classification is
   written down in PORTING.md and enforced by review — an "ordered" hook
   accidentally moved onto the pipelined store path is a conformance bug.
