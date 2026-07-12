# Migrating from `@hocuspocus/server` (Node) to the Rust server

The Rust server speaks the exact same wire protocol as
`@hocuspocus/server`, so **clients need no changes**: existing
`@hocuspocus/provider` apps connect as-is. What changes is how you deploy
the server and how your application logic hooks into it — in-process
TypeScript hooks become an HTTP webhook contract.

Conformance status: the applicable portion of this repository's test suite
runs against the Rust binary in CI (`pnpm test:rust`; see
`tests/conformance/rust-target.json`).

## 1. Install

- **npm:** `npm install @hocuspocus/server-rust && npx hocuspocus-server`
- **Docker:** `docker run -p 1234:1234 ghcr.io/ueberdosis/hocuspocus-server`
- **Binaries:** GitHub releases (`server-rust-v*` tags), six platforms.
- **Cargo:** `cargo install --path crates/hocuspocus-server` (or use
  `hocuspocus-core` as an embedded Rust library with native traits).

## 2. Configuration mapping

TOML file (`hocuspocus.toml`, or `--config`/`HOCUSPOCUS_CONFIG`) layered
under `HOCUSPOCUS_*` environment variables — a double underscore nests
sections: `HOCUSPOCUS_SERVER__TIMEOUT_MS=60000`. Durations are
milliseconds, same numbers as the TS options.

| `ServerConfiguration` (TS)        | Rust config                            | Default            |
| --------------------------------- | -------------------------------------- | ------------------ |
| `port` / `address`                | `[server] listen`                      | `0.0.0.0:1234`     |
| `name`                            | `[server] name`                        | –                  |
| `quiet`                           | `[server] quiet`                       | `false`            |
| `timeout`                         | `[server] timeout_ms`                  | `60000`            |
| `debounce`                        | `[server] debounce_ms`                 | `2000`             |
| `maxDebounce`                     | `[server] max_debounce_ms`             | `10000`            |
| `unloadImmediately`               | `[server] unload_immediately`          | `true`             |
| `maxUnauthenticatedQueueSize`     | `[server] max_unauthenticated_queue_size` | 5 MiB           |
| `maxUnauthenticatedQueueMessages` | `[server] max_unauthenticated_queue_messages` | `1000`      |
| `maxPendingDocuments`             | `[server] max_pending_documents`       | `100`              |

## 3. Hooks → webhook contract

Application logic moves behind one signed HTTP endpoint you implement
(`[webhook] url` + `secret`; signature header
`X-Hocuspocus-Signature-256: sha256=<hmac-sha256-hex>` — byte-compatible
with `@hocuspocus/extension-webhook`, so existing verification code keeps
working). Full payload schemas: `crates/RFC.md` § 8.

| TS hook             | Rust equivalent                                                               |
| ------------------- | ----------------------------------------------------------------------------- |
| `onAuthenticate`    | `[auth] mode = "webhook"` → `auth` event; respond `{context, scope}` or 403 `{reason}` |
| `onLoadDocument`    | `[storage] backend = "webhook"` → `GET {url}/documents/{name}` (200 = yjs update, 404 = new; `X-Hocuspocus-Context` header) |
| `onStoreDocument`   | `PUT {url}/documents/{name}` (body = full state update), debounced          |
| `onConnect`         | `connect` event (awaited before auth; non-2xx rejects; response `{context}` merges) |
| `onDisconnect`      | `disconnect` event (payload carries `context`)                               |
| `onChange`          | `change` event (debounced; incremental update, base64)                       |
| `onStateless`       | `stateless` event; response `{respond}` answers the sender                   |
| `broadcastStateless`| `POST /control/broadcast-stateless {documentName, payload}`                  |
| `closeConnections`  | `POST /control/close-connections`                                            |
| `getConnectionsCount` / `getDocumentsCount` | `GET /control/stats`                                  |

Not carried over (build these in your app or open an issue):
`beforeHandleMessage`-style in-process interceptors, custom TS extension
classes, `openDirectConnection` over HTTP (embedders get
`DocMessage::DirectTransact` in Rust), `@hocuspocus/transformer` (see § 6).

## 4. Extensions mapping

| Node extension          | Rust server                                                    |
| ----------------------- | -------------------------------------------------------------- |
| `extension-redis`       | `[redis] url` (+ `prefix`, `identifier`) — interoperable, § 5  |
| `extension-sqlite`      | `[storage] backend = "sqlite"`, `path` (same schema/upserts)   |
| `extension-database`    | `backend = "postgres"` (`url`) or `"webhook"`                  |
| `extension-s3`          | `backend = "s3"` (`bucket`, `region`, `endpoint`, `prefix`)    |
| `extension-webhook`     | `[webhook]` section (same signature scheme)                    |
| `extension-logger`      | `tracing` (`RUST_LOG=hocuspocus=debug`)                        |
| `extension-throttle`    | not yet ported — keep it at your ingress/load balancer         |

## 5. Mixed-fleet rollout (zero downtime)

The Redis integration is byte-compatible with `extension-redis`: same
channels (`{prefix}:{documentName}`), same frame format, same store-lock
keys and try-once semantics. Node and Rust instances can therefore serve
the **same documents at the same time**, which makes the rollout safe:

1. **Shadow:** add one Rust instance to the production Redis, pointed at a
   shadow storage target. Compare persisted state vectors against
   Node-persisted documents. No user traffic.
2. **Canary:** route a small share of connections to the Rust instance at
   the load balancer. Documents converge across the fleet via Redis
   regardless of which instance a client lands on.
3. **Scale out/in:** shift LB weight gradually; watch `/metrics`
   (`hocuspocus_document_stores_total{outcome="failure"}`,
   `hocuspocus_auth_denied_total`, latency of your webhook endpoint).
4. **Rollback:** set the Rust weight to 0. The persistence format is the
   plain yjs update (v1) in both implementations — no data migration in
   either direction.

## 6. `@hocuspocus/transformer` (Tiptap/ProseMirror JSON)

The Rust server does not embed a JS runtime, so `change` events carry the
raw yjs update instead of ProseMirror JSON. Apply the update in your own
Node process with the existing transformer:

```js
// transformer-sidecar.mjs — POST target for [webhook] events = "change"
import http from "node:http";
import crypto from "node:crypto";
import * as Y from "yjs";
import { TiptapTransformer } from "@hocuspocus/transformer";

const SECRET = process.env.WEBHOOK_SECRET;
const documents = new Map(); // documentName → Y.Doc (or rebuild from your DB)

http.createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const body = Buffer.concat(chunks);
    const signature = `sha256=${crypto.createHmac("sha256", SECRET).update(body).digest("hex")}`;
    if (request.headers["x-hocuspocus-signature-256"] !== signature) {
      response.writeHead(403).end();
      return;
    }
    const { event, payload } = JSON.parse(body.toString());
    if (event === "change") {
      let document = documents.get(payload.documentName);
      if (!document) documents.set(payload.documentName, (document = new Y.Doc()));
      Y.applyUpdate(document, Buffer.from(payload.update, "base64"));
      const json = TiptapTransformer.fromYdoc(document);
      // …persist `json` wherever your app needs it.
    }
    response.writeHead(200, { "Content-Type": "application/json" }).end("{}");
  });
}).listen(8090);
```

## 7. Operations

- `/healthz` — liveness. `/metrics` — Prometheus (connection/document
  gauges; message, store, auth-denial counters). `/control/stats` — JSON.
- First stdout line is `{"name":…,"address":…,"port":…}` — orchestration
  can wait for it (port 0 binds a free port).
- Graceful shutdown on SIGTERM/SIGINT: clients are closed with 4205 (they
  auto-reconnect to healthy replicas), pending stores are flushed.
- Logs via `tracing`: `RUST_LOG=info` (default), `hocuspocus=debug` for
  wire-level detail.
