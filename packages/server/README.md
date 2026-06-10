# @hocuspocus/server
[![Version](https://img.shields.io/npm/v/@hocuspocus/server.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/server)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/server.svg)](https://npmcharts.com/compare/tiptap?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/server.svg)](https://www.npmjs.com/package/@hocuspocus/server)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

The collaborative editing backend for [Tiptap](https://github.com/ueberdosis/tiptap). Built on [Y.js](https://github.com/yjs/yjs), runs on Node.js (22+), Bun, Deno, and Cloudflare Workers.

## Installation

```bash
npm install @hocuspocus/server
```

## Usage

Minimal WebSocket server on port `1234`:

```js
import { Server } from "@hocuspocus/server"

const server = new Server({
  port: 1234,
})

server.listen()
```

Hook into the document lifecycle:

```js
import { Server } from "@hocuspocus/server"

const server = new Server({
  port: 1234,

  async onAuthenticate({ token }) {
    if (token !== "super-secret-token") {
      throw new Error("Not authorized!")
    }
  },

  async onLoadDocument({ documentName }) {
    // return a Y.Doc for new documents, or nothing to use the default empty doc
  },

  async onStoreDocument({ documentName, document }) {
    // persist the Y.Doc binary state wherever you like
  },
})

server.listen()
```

For a database-backed server, combine with an extension like [`@hocuspocus/extension-sqlite`](../extension-sqlite) or [`@hocuspocus/extension-database`](../extension-database).

## Non-Node.js runtimes

Use the `Hocuspocus` class directly to attach to any `WebSocketLike` instance (Bun, Deno, Cloudflare Workers, Express, etc.):

```js
import { Hocuspocus } from "@hocuspocus/server"

const hocuspocus = new Hocuspocus({ /* config */ })

// pass any WebSocket-like instance + request + optional context:
hocuspocus.handleConnection(ws, request, context)
```

## Documentation

Full reference, hooks, extensions, and scaling guides: [tiptap.dev/docs/hocuspocus](https://tiptap.dev/docs/hocuspocus).

## License

MIT — see [LICENSE.md](https://github.com/ueberdosis/hocuspocus/blob/main/LICENSE.md).
