# @hocuspocus/extension-redis
[![Version](https://img.shields.io/npm/v/@hocuspocus/extension-redis.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/extension-redis)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/extension-redis.svg)](https://npmcharts.com/compare/tiptap?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/extension-redis.svg)](https://www.npmjs.com/package/@hocuspocus/extension-redis)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

Scale [Hocuspocus](https://github.com/ueberdosis/hocuspocus) horizontally across multiple server instances. Uses Redis pub/sub to broadcast document updates and awareness between servers, so clients connected to different instances stay in sync on the same document.

## Installation

```bash
npm install @hocuspocus/extension-redis
```

## Usage

Point every Hocuspocus instance at the same Redis:

```js
import { Server } from "@hocuspocus/server"
import { Redis } from "@hocuspocus/extension-redis"

const server = new Server({
  port: 1234,
  extensions: [
    new Redis({
      host: "127.0.0.1",
      port: 6379,
    }),
  ],
})

server.listen()
```

### Bring your own Redis client

If you already have an `ioredis` client (including Cluster), pass it in directly instead of host/port:

```js
import RedisClient from "ioredis"

new Redis({
  redis: new RedisClient({ host: "127.0.0.1", port: 6379 }),
})
```

Redis handles real-time sync — you still need a persistence extension (e.g. [`@hocuspocus/extension-sqlite`](../extension-sqlite), [`@hocuspocus/extension-s3`](../extension-s3), or your own [`Database`](../extension-database)) to store documents long-term.

### Consistent reads on load

When a document is loaded on one instance while another instance already has it
open (and possibly modified in memory, not yet persisted), the load blocks until
the other instance has sent its current state — so a `DirectConnection` or a
freshly connected client observes the latest collaborative content rather than
just what was read from storage. If no other instance has the document open, the
load is not delayed.

The wait is bounded by `awaitInitialSyncTimeout` (ms, default `1000`). Set it to
`0` to disable the wait and restore the previous fire-and-forget behavior:

```js
new Redis({
  host: "127.0.0.1",
  port: 6379,
  awaitInitialSyncTimeout: 1000,
})
```

## Documentation

Full scaling architecture and multi-instance deployment guide: [tiptap.dev/docs/hocuspocus/server/extensions/redis](https://tiptap.dev/docs/hocuspocus/server/extensions/redis).

## License

MIT — see [LICENSE.md](https://github.com/ueberdosis/hocuspocus/blob/main/LICENSE.md).
