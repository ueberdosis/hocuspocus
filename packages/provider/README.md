# @hocuspocus/provider
[![Version](https://img.shields.io/npm/v/@hocuspocus/provider.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/provider)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/provider.svg)](https://npmcharts.com/compare/tiptap?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/provider.svg)](https://www.npmjs.com/package/@hocuspocus/provider)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

The client-side provider for [Hocuspocus](https://github.com/ueberdosis/hocuspocus). Connects to a Hocuspocus server over WebSockets and syncs one or more [Y.js](https://github.com/yjs/yjs) documents — including awareness (presence), authentication, and stateless messaging.

> **Building a React app?** Use [`@hocuspocus/provider-react`](../provider-react) instead — it wraps the provider in components and hooks so React handles the lifecycle for you (including StrictMode double-mounts).

## Installation

```bash
npm install @hocuspocus/provider yjs
```

## Usage

```js
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"

const ydoc = new Y.Doc()

const provider = new HocuspocusProvider({
  url: "ws://127.0.0.1:1234",
  name: "example-document",
  document: ydoc,
})
```

Changes to `ydoc` are now synced to every other client connected to the same `name`.

### Authenticating

Pass a `token` — it's forwarded to the server's `onAuthenticate` hook:

```js
new HocuspocusProvider({
  url: "wss://collab.example.com",
  name: "example-document",
  document: ydoc,
  token: "super-secret-token",
})
```

### Sharing a socket across documents

Create a `HocuspocusProviderWebsocket` once, then reuse it for multiple documents:

```js
import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider"

const socket = new HocuspocusProviderWebsocket({ url: "ws://127.0.0.1:1234" })

const doc1 = new HocuspocusProvider({ websocketProvider: socket, name: "doc-1" })
const doc2 = new HocuspocusProvider({ websocketProvider: socket, name: "doc-2" })
```

Call `provider.destroy()` to disconnect a single document. Call `socket.destroy()` to tear down the shared connection.

## Documentation

Full configuration, events, and awareness reference: [tiptap.dev/docs/hocuspocus/provider](https://tiptap.dev/docs/hocuspocus/provider/overview).

## License

MIT — see [LICENSE.md](https://github.com/ueberdosis/hocuspocus/blob/main/LICENSE.md).
