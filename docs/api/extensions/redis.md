---
tableOfContents: true
---

# Redis

## Introduction
Hocuspocus can be scaled horizontally using the Redis extension. You can spawn multiple instances of the server behind a load balancer and sync changes and awareness states through Redis.

Thanks to [@tommoor](https://github.com/tommoor) for writing the initial implementation of that extension.

## Installation
Install the Redis extension with:

```bash
npm install @hocuspocus/extension-redis
```

## Configuration
For a full documentation on all available redis and redis cluster options, check out the [ioredis API docs](https://github.com/luin/ioredis/blob/master/API.md).

```js
import { Server } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'

const server = Server.configure({
  extensions: [
    new Redis({
      // [required] Hostname of your Redis instance
      host: '127.0.0.1',

      // [required] Port of your Redis instance
      port: 6379,
    })
  ],
})

server.listen()
```

## Storing documents
The Redis extension works well with the database extension. Once an instance stores a document, it’s blocked for all other instances to avoid write conflicts.

```js
import { Hocuspocus } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Redis } from '@hocuspocus/extension-redis'
import { SQLite } from '@hocuspocus/extension-sqlite'

// Server 1
const server = new Hocuspocus({
  name: 'server-1',
  port: 1234,
  extensions: [
    new Logger(),
    new Redis({
      host: '127.0.0.1',
      port: 6379,
    }),
    new SQLite(),
  ],
})

server.listen()

// Server 2
const anotherServer = new Hocuspocus({
  name: 'server-2',
  port: 1235,
  extensions: [
    new Logger(),
    new Redis({
      host: '127.0.0.1',
      port: 6379,
    }),
    new SQLite(),
  ],
})

anotherServer.listen()
```
