# PORTING.md — TypeScript → Rust rules

Explicit porting rules for the Hocuspocus Rust rewrite, in the spirit of the
porting guide that anchored Bun's Zig→Rust migration: every construct in the
TypeScript server has a named Rust equivalent, and every behavior is
classified as *byte-exact*, *semantic*, or *allowed to differ*. When in
doubt during implementation, this file — together with the conformance suite
— is the tie-breaker, not intuition.

## 1. Construct mapping

| TypeScript construct | Rust equivalent | Notes |
|---|---|---|
| `Hocuspocus` engine class | `hocuspocus-core` (`DocRegistry` + actors + `HookChain`) | transport-agnostic, like the TS split between `Hocuspocus.ts` and `Server.ts` |
| `Server` (http + crossws) | `hocuspocus-axum` + `hocuspocus-server` | |
| `Document extends Y.Doc` | document actor owning `yrs::Doc` + `Awareness` | mutation only via mailbox |
| `documents: Map<string, Document>` | `DocRegistry { HashMap<Arc<str>, DocSlot> }` | std mutex, never held across `.await` |
| `loadingDocuments` map | `DocSlot::Loading(Shared<future>)` | concurrent loads await one future |
| `unloadingDocuments` map | `DocSlot::Unloading(Shared<future>)` | load-during-unload waits, then retries |
| `ClientConnection` | per-socket reader/writer tasks + `AuthState` machine | |
| `Connection` (per doc) | `ConnId` subscription in the actor + bounded outbound sender | |
| `Connection.messageAddress` | `DocumentAddress.raw` | replies echo raw key, never bare name |
| `DirectConnection.transact()` | `DocMessage::DirectTransact` + `Origin::Local` | `skipStoreHooks` supported |
| hook functions on config + `Extension` interface | `trait Extension` (25 default no-op methods) | 1:1 names, snake_case |
| extension `priority` (default 100, sort desc) | `Extension::priority() -> i32`, stable sort desc | Redis = 1000 |
| throw inside a hook | `HookError::Abort(err)` | chain stops, error propagates |
| `SkipFurtherHooksError` | `HookError::SkipFurtherHooks` | chain stops, treated as success |
| hook return value merged into `context` | `&mut Context` on the payload | explicit mutation |
| freeform `context` object | `Context { data: serde_json::Map, typed: anymap }` | JSON half round-trips through webhooks |
| `TransactionOrigin` (`connection`/`redis`/`local`) | `enum Origin` | `skips_store_hooks()` = TS `shouldSkipStoreHooks` |
| `useDebounce` (`debounce`, `maxDebounce`) | actor timer at `min(last_change + debounce, dirty_since + max_debounce)` | forced store every `maxDebounce` |
| `saveMutex` (`async-mutex`) | `DocHandle.save_lock` (`tokio::sync::Mutex`) | unload flush contends on the same lock |
| `debouncer.executeNow` | `DocMessage::FlushStoreNow` | last-disconnect + shutdown |
| lib0 `encoding`/`decoding` | `hocuspocus_protocol::varint::{Reader, Writer}` | byte-exact |
| `OutgoingMessage` builder | `hocuspocus_protocol::MessageBuilder` | encode once, `Bytes`-clone per subscriber |
| `extension-database` `fetch`/`store` | `trait Storage` | same blob format (yjs update v1, full state) |
| `onAuthenticate` returning `{ readOnly: true }` | `payload.connection.read_only = true` | |
| ws unbounded send buffer | bounded outbound budget (16 MiB default) → close 4205 | **allowed to differ** — documented |
| `setInterval` connection check | absolute pre-auth deadline + post-auth idle timer per socket | same timeout config |
| Node `Buffer` document state | `bytes::Bytes` | zero-copy slices off the socket frame |

## 2. Hook semantics table

Execution: sequential across extensions, priority descending. "Inline"
hooks are awaited by the document actor / connection task in order —
moving one onto a pipelined path is a conformance bug. "Pipelined" hooks
run on spawned tasks (store path) serialized by `save_lock`.

| # | Hook | Trigger | Can abort? | Scheduling | Webhook-mapped (v1) | Conformance tier |
|---|---|---|---|---|---|---|
| 1 | onConfigure | engine construction | no | startup | — | 3 (Rust-native) |
| 2 | onListen | listener bound | yes (abort startup) | startup | — | 3 |
| 3 | onUpgrade | HTTP → WS upgrade | yes (reject upgrade) | inline | — | 3 |
| 4 | onRequest | plain HTTP request | yes (custom response) | inline | — | 3 |
| 5 | onConnect | first Auth frame for a doc | yes → 4403 | inline | `connect` event | 2 |
| 6 | onAuthenticate | after onConnect, token available | yes → PermissionDenied + 4401 | inline | `auth` event | 2 |
| 7 | connected | after auth + doc ready | no (errors logged) | inline | — | 1 (wire-observable) |
| 8 | onTokenSync | client re-sends token | yes | inline | `auth` event | 2 |
| 9 | onCreateDocument | before doc construction, first load | yes | load path | — | 3 |
| 10 | onLoadDocument | doc constructed, before traffic | yes (load fails, conns dropped) | load path | `GET /documents/{name}` | 2 |
| 11 | afterLoadDocument | doc ready | no | load path | — | 3 |
| 12 | beforeHandleMessage | every inbound enveloped frame | yes (frame rejected) | inline | — | 3 |
| 13 | afterHandleMessage | after apply (even on error) | no | inline | — | 3 |
| 14 | beforeSync | inbound sync frame | yes (sync rejected) | inline | — | 3 |
| 15 | beforeHandleAwareness | inbound awareness frame | yes | inline (mutable states) | — | 3 |
| 16 | onAwarenessUpdate | awareness changed | no | inline | — | 2 |
| 17 | onStateless | inbound Stateless | yes | inline | — | 1/2 |
| 18 | beforeBroadcastStateless | server broadcasts stateless | yes | inline | — | 1/2 |
| 19 | onChange | update applied to doc | no (errors logged) | inline | `change` event (debounced) | 2 |
| 20 | onStoreDocument | debounce/maxDebounce fired, or flush | yes (store fails) | **pipelined** (under save_lock) | `PUT /documents/{name}` | 2 |
| 21 | afterStoreDocument | store done | no | **pipelined** | — | 2 |
| 22 | onDisconnect | per-doc connection closed | no | inline | `disconnect` event | 2 |
| 23 | beforeUnloadDocument | zero subscribers observed | yes (abort unload) | unload path (+ re-check emptiness after) | — | 3 |
| 24 | afterUnloadDocument | actor dropped | no | unload path | — | 3 |
| 25 | onDestroy | shutdown | no | shutdown | — | 3 |

Tier legend (see RFC § 11): 1 = existing TS test runs unmodified against the
binary; 2 = existing TS test runs with its hook closures served over the
webhook contract; 3 = Rust-native test.

## 3. Byte-exact / semantic / allowed-to-differ

**Byte-exact** (golden vectors, asserted by fixtures):

- lib0 var-uint / var-string / var-uint8array encodings
- the message envelope and every `MessageType` opcode (0–10)
- auth sub-messages, incl. the optional trailing providerVersion and the
  scope strings `"readonly"` / `"read-write"`
- bare 1-byte Ping/Pong frames
- close codes **and reason strings** (1009, 4205, 4401, 4403, 4408)
- Redis frame layout (`[u8 len][identifier][wire message]`), channel and
  lock key names
- webhook signature: `X-Hocuspocus-Signature-256: sha256=<hmac-sha256 hex>`
- persistence blob: yjs update v1, full state against the empty state
  vector; sqlite row shape `documents(name, data)`; S3 key
  `{prefix}{documentName}.bin`

**Semantic** (behavior identical, bytes may differ):

- yjs updates produced by the server (yrs merge/GC timing differs legally;
  assert document equality via state vectors/content)
- sync handshake ordering: client Step1 → server Step2 + own Step1;
  SyncReply never triggers a reciprocal Step1; SyncStatus after apply
- read-only connections: no mutation, snapshot-containment ack
- hook order and error semantics per the table above
- debounce timing: store at `debounce` after the last change, forced at
  `maxDebounce` after the first unsaved change; stores serialized;
  redis-origin changes schedule no store
- pre-auth queue limits (5 MiB / 1000 msgs / 100 docs) and the
  non-refreshable pre-auth deadline; post-auth idle timeout
- unload: only when empty, delay + emptiness re-check, final flush under
  the save lock

**Allowed to differ** (documented divergences):

- outbound backpressure: bounded per-connection budget with 4205 close
  (Node buffers unboundedly) — metric + warning before close
- internal logging format (`tracing` instead of kleur console output)
- the startup banner; HTTP responses beyond `/` welcome text and status
  codes
- performance characteristics (that's the point)

## 4. Conformance dashboard

```bash
# build the binary, then run the TS suite against it
cargo build -p hocuspocus-server
HOCUSPOCUS_TEST_TARGET=rust pnpm test
```

The dispatcher in `tests/utils/newHocuspocus.ts` (lands in M2) skips tests
listed in `tests/conformance/skip-map.json` (with reason codes) and prints
`N applicable, M passing`. That number is the exit gate for every milestone
(RFC § 13). The default `pnpm test` continues to run the Node server and
must stay green throughout — the TS packages remain the product for JS
users until GA of the binary.
