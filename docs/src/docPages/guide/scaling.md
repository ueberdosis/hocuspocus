# Scaling
:::warning Keep in mind
The redis adapter only syncs document changes. Collaboration cursors are not yet supported.
:::

To scale the WebSocket server, you can spawn multiple instances of the server behind a load balancer and sync changes between the instances through Redis. Import the Redis adapter and register it with hocuspocus. For a full documentation on all available redis and redis cluster options, check out the [ioredis API docs](https://github.com/luin/ioredis/blob/master/API.md).

```js
import { Server } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/redis'

const server = Server.configure({
  persistence: new Redis({
    host: '127.0.0.1',
    port: 6379,
  }),
})

server.listen()
```

If you want to use a redis cluster, use the redis cluster adapter:

```js
import { Server } from '@hocuspocus/server'
import { RedisCluster } from '@hocuspocus/redis'

const server = Server.configure({
  persistence: new RedisCluster({
    scaleReads: 'all',
    redisOptions: {
      host: '127.0.0.1',
      port: 6379,
    }
  }),
})

server.listen()
```
