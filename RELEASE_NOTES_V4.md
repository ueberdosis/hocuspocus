# Hocuspocus v4.0 Release Notes

Hocuspocus v4 is a major release that brings cross-runtime support, improved type safety, and important bug fixes. This release focuses on making Hocuspocus run beyond Node.js -- on Bun, Deno, Cloudflare Workers, and Node with uWebSockets -- while improving the developer experience with generic Context typing and structured transaction origins.

## Highlights

### Cross-Runtime Support

Hocuspocus is no longer tied to the Node.js `ws` library. The server now uses [crossws](https://github.com/unjs/crossws), a universal WebSocket adapter, enabling Hocuspocus to run on:

- **Node.js** (with `ws` or `uWebSockets.js`)
- **Bun**
- **Deno**
- **Cloudflare Workers**

The built-in `Server` class continues to work as before for Node.js users. For other runtimes, use `Hocuspocus` directly with `handleConnection()`, which now accepts any `WebSocketLike` object and a web-standard `Request`.

### Generic Context Type

All core classes and hook payloads now accept a generic `Context` type parameter, enabling end-to-end type safety:

```typescript
interface MyContext {
  userId: string;
  permissions: string[];
}

const server = Server.configure<MyContext>({
  async onAuthenticate({ context, token }) {
    // context is typed as MyContext
    return { userId: '123', permissions: ['read', 'write'] };
  },
  async onChange({ context }) {
    // context.userId is typed as string
    console.log(context.userId);
  },
});
```

The generic defaults to `any`, so existing code without explicit typing continues to work.

### Ordered Message Processing

Document updates are now processed sequentially in the order they are received. Previously, concurrent messages could be processed out of order if async hooks were involved. A new internal message queue ensures CRDT updates are applied consistently.

### Web Standard Request/Headers

Hook payloads now use the web-standard `Request` and `Headers` objects instead of Node.js `IncomingMessage` and `IncomingHttpHeaders`. This aligns with the cross-runtime goal and provides a consistent API across all environments.

## New Features

- **Cross-runtime WebSocket support** via `crossws` -- Bun, Deno, Cloudflare Workers, Node/uWebSockets all supported
- **Generic `Context` type parameter** on `Hocuspocus`, `Server`, `Extension`, `Connection`, `ClientConnection`, `DirectConnection`, and all hook payloads
- **Structured transaction origins** -- new `TransactionOrigin` union type (`ConnectionTransactionOrigin | RedisTransactionOrigin | LocalTransactionOrigin`) with helper functions `isTransactionOrigin()` and `shouldSkipStoreHooks()`
- **`onLoadDocument` now accepts `Uint8Array` returns** -- extensions can return raw Yjs updates instead of constructing a full `Y.Doc`, simplifying storage extensions
- **`handleConnection()` returns `ClientConnection`** -- enables programmatic access to the connection lifecycle for custom integrations
- **Ordered message processing** -- messages are queued and processed sequentially per connection
- **Auth retry support** -- failed authentication now properly cleans up state, allowing clients to retry without reconnecting
- **DirectConnection context** -- `openDirectConnection(documentName, context)` now accepts and propagates a context object
- **Store hooks on all changes** -- `onStoreDocument` is now triggered on any document change (not just WebSocket-originated ones), with explicit opt-out via `skipStoreHooks` on `LocalTransactionOrigin`

## Bug Fixes

- **Auth state reset on failure** -- when authentication fails, document state is cleaned up so the client can send a new auth message without reconnecting (#944)
- **`onLoadDocument` accepts `Uint8Array`** -- the callback now correctly handles both `Y.Doc` and `Uint8Array` returns (#795, #271)
- **Close code type check** -- close event codes are now properly validated as numbers (#1062)
- **Store hooks reliability** -- `onStoreDocument` now triggers on any document change, preventing accidental data loss when updates lacked a Yjs origin
- **Unknown message types no longer crash the provider** -- `console.error` instead of `throw`. This makes future protocol additions easier.
- **`onStoreDocument` payload type** -- the Database extension and Logger extension now correctly type the parameter as `onStoreDocumentPayload` instead of the incorrect `onChangePayload` / `onDisconnectPayload`

## Infrastructure Changes

- **Package manager**: migrated from npm to **pnpm** workspaces
- **Bundler**: migrated from Rollup to **Rolldown**
- **SQLite extension**: migrated from `sqlite3` to **better-sqlite3** (synchronous API, actively maintained)
- **Node.js requirement**: `>=22` (specified in `@hocuspocus/server`)
- **Default timeout**: increased from 30s to 60s
- **Lerna**: upgraded to v9 with pnpm as npm client

---

# Upgrade Guide: v3 to v4

## 1. Update Dependencies

```bash
# Install v4
npm install @hocuspocus/server@^4.0.0 @hocuspocus/provider@^4.0.0
```

If you use the SQLite extension:

```bash
npm uninstall sqlite3
npm install @hocuspocus/extension-sqlite@^4.0.0 better-sqlite3
npm install -D @types/better-sqlite3
```

**Node.js requirement**: v4 requires Node.js 22 or later.

## 2. Request and Headers (Breaking)

All hook payloads now use web-standard `Request` and `Headers` instead of Node.js `IncomingMessage` and `IncomingHttpHeaders`.

### Before (v3)

```typescript
async onAuthenticate({ request, requestHeaders }) {
  const token = requestHeaders['authorization'];
  const ip = requestHeaders['x-forwarded-for'];
  const url = request.url;
}
```

### After (v4)

```typescript
async onAuthenticate({ request, requestHeaders }) {
  const token = requestHeaders.get('authorization');
  const ip = requestHeaders.get('x-forwarded-for');
  const url = request.url;
}
```

**Key differences:**
- `requestHeaders['key']` becomes `requestHeaders.get('key')`
- `request.socket.remoteAddress` is no longer available -- use `x-forwarded-for` or `x-real-ip` headers from your reverse proxy
- `request` is now a web `Request` object, not Node.js `IncomingMessage`

**Note:** The `onUpgrade` and `onRequest` hooks still use Node.js `IncomingMessage`/`ServerResponse` since they operate at the HTTP level before the WebSocket upgrade.

## 3. `onStoreDocument` Payload (Breaking)

The `onStoreDocument` and `afterStoreDocument` payloads have been restructured. Several fields that were tied to a specific connection have been removed, since store hooks can now be triggered by non-connection sources.

### Before (v3)

```typescript
async onStoreDocument({
  context,
  requestHeaders,
  requestParameters,
  socketId,
  transactionOrigin,
  document,
  documentName,
  clientsCount,
  instance,
}) {
  // ...
}
```

### After (v4)

```typescript
async onStoreDocument({
  lastContext,           // was: context
  lastTransactionOrigin, // was: transactionOrigin
  document,
  documentName,
  clientsCount,
  instance,
  // removed: requestHeaders, requestParameters, socketId
}) {
  // ...
}
```

**Migration:**
- `context` &rarr; `lastContext`
- `transactionOrigin` &rarr; `lastTransactionOrigin`
- `requestHeaders`, `requestParameters`, `socketId` -- removed. If you need these, access them from the `lastContext`. Note that the contain the context of the last connection that triggered the hook.

## 4. `onAwarenessUpdate` Payload (Breaking)

The `onAwarenessUpdate` payload has been simplified. Connection-specific fields are removed and replaced with the source of the update.

### Before (v3)

```typescript
async onAwarenessUpdate({
  context,
  requestHeaders,
  requestParameters,
  socketId,
  document,
  documentName,
  added, updated, removed, states,
}) {
  // ...
}
```

### After (v4)

```typescript
async onAwarenessUpdate({
  transactionOrigin,     // new: structured origin
  connection,            // new: optional, the connection that triggered the update
  document,
  documentName,
  added, updated, removed,
  awareness,             // new: the Awareness instance
  states,
  // removed: context, requestHeaders, requestParameters, socketId
}) {
  // Access context through the connection if needed
  const context = connection?.context;
}
```

## 5. WebSocket Type Changes (Breaking)

If your code references the `WebSocket` type from the `ws` package, update to `WebSocketLike`:

### Before (v3)

```typescript
import { WebSocket } from 'ws';

// In your code
const ws: WebSocket = connection.webSocket;
```

### After (v4)

```typescript
import type { WebSocketLike } from '@hocuspocus/server';

// In your code
const ws: WebSocketLike = connection.webSocket;
```

The `WebSocketLike` interface is minimal:

```typescript
interface WebSocketLike {
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  readyState: number;
}
```

## 6. Server Constructor (Breaking)

WebSocket options are now passed inside the configuration object instead of as a separate parameter.

### Before (v3)

```typescript
import { Server } from '@hocuspocus/server';

const server = new Server(
  { port: 8080, extensions: [...] },
  { maxPayload: 1024 * 1024 }  // ws options as 2nd arg
);
```

### After (v4)

```typescript
import { Server } from '@hocuspocus/server';

const server = new Server({
  port: 8080,
  extensions: [...],
  websocketOptions: { maxPayload: 1024 * 1024 },
});
```

`Server.configure()` still works the same way -- just move `websocketOptions` into the config.

## 7. Transaction Origin Changes

If you inspect `transactionOrigin` in hooks (e.g., in `onChange`), the format has changed from raw values to structured objects.

### Before (v3)

```typescript
async onChange({ transactionOrigin }) {
  if (transactionOrigin === '__hocuspocus__redis__origin__') {
    // came from Redis
  }
  if (transactionOrigin instanceof Connection) {
    // came from a client connection
  }
}
```

### After (v4)

```typescript
import { isTransactionOrigin, shouldSkipStoreHooks } from '@hocuspocus/server';

async onChange({ transactionOrigin }) {
  if (isTransactionOrigin(transactionOrigin)) {
    switch (transactionOrigin.source) {
      case 'redis':
        // came from Redis
        break;
      case 'connection':
        // came from a client connection
        // transactionOrigin.connection is available
        break;
      case 'local':
        // came from server-side code (e.g., DirectConnection)
        break;
    }
  }
}
```

## 8. SQLite Extension (Breaking)

The SQLite extension has been migrated from the unmaintained `sqlite3` package to `better-sqlite3`.

**What you need to do:**
1. Replace the `sqlite3` dependency with `better-sqlite3`
2. No changes to your Hocuspocus configuration -- the extension API is the same
3. Existing SQLite database files are fully compatible (no data migration needed)

If you wrote a **custom schema** for the SQLite extension, note that `better-sqlite3` uses named parameters without the `$` prefix:
- `$name` &rarr; `name`
- `$data` &rarr; `data`

## 9. Custom `handleConnection` Integrations (Breaking)

If you call `handleConnection()` directly (e.g., for Express/Koa integration), the signature has changed:

### Before (v3)

```typescript
import { IncomingMessage } from 'http';

wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
  hocuspocus.handleConnection(ws, request, context);
});
```

### After (v4)

```typescript
wss.on('connection', (ws, request: Request) => {
  const clientConnection = hocuspocus.handleConnection(ws, request, context);
  // clientConnection is now returned for programmatic access
});
```

**Key changes:**
- `request` must be a web-standard `Request` (not `IncomingMessage`)
- The method now returns a `ClientConnection` instance
- The WebSocket no longer needs to be from the `ws` package -- any `WebSocketLike` works
- You are responsible for calling `clientConnection.handleMessage(data)` and `clientConnection.handleClose(event)` if you're not using the built-in `Server` class

## 10. Timeout Change

The default connection timeout has increased from 30 seconds to 60 seconds. If you relied on the old default, you can restore it:

```typescript
const server = Server.configure({
  timeout: 30_000,
});
```

## 11. Provider Changes (Non-Breaking)

No code changes are required in your provider setup.

## Summary Checklist

- [ ] Update to Node.js 22+
- [ ] Update all `@hocuspocus/*` packages to v4
- [ ] Replace `requestHeaders['key']` with `requestHeaders.get('key')` in all hooks
- [ ] Replace `request.socket.remoteAddress` with proxy headers (`x-forwarded-for`)
- [ ] Update `onStoreDocument` handlers: `context` -> `lastContext`, remove `requestHeaders`/`requestParameters`/`socketId`
- [ ] Update `onAwarenessUpdate` handlers if used
- [ ] Replace `WebSocket` type imports from `ws` with `WebSocketLike` from `@hocuspocus/server`
- [ ] Move `websocketOptions` into the `Server` configuration object
- [ ] Update transaction origin checks to use `isTransactionOrigin()` and `.source`
- [ ] If using SQLite extension: replace `sqlite3` with `better-sqlite3`
- [ ] If using custom `handleConnection`: update to new signature and `Request` type
- [ ] Test your extensions and hooks thoroughly
