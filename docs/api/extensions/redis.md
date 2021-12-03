---
tableOfContents: true
---

# Redis

## Introduction

:::warning Work in progress
Currently, the Redis extension only syncs document changes. Awareness states, for example cursors, are not yet supported.
:::

hocuspocus can be scaled horizontally using the Redis extension. You can spawn multiple instances of the server behind a load balancer and sync changes between the instances through Redis pub/sub.

## Installation

Install the Redis package with:

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

If you want to use a cluster instead of a single Redis instance, use the Redis cluster extension:

```js
import { Server } from '@hocuspocus/server'
import { RedisCluster } from '@hocuspocus/redis'

const server = Server.configure({
  extensions: [
    new RedisCluster({
      scaleReads: 'all',
      redisOptions: {
        host: '127.0.0.1',
        port: 6379,
      },
    })
  ],
})

server.listen()
```
