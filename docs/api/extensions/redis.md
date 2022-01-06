---
tableOfContents: true
---

# Redis

## Introduction
:::warning Work in progress
Currently, the Redis extension only syncs document changes. Awareness states, for example cursors, are not yet supported.
:::

This extension allows horizontal scaling of Hocuspocus instances, allowing any
client to connect to any instance and share document state between them.

## Installation
Install the package with:

```bash
npm install @hocuspocus/extension-redis
```

## Configuration
```js
import { Server } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'

const server = Server.configure({
  extensions: [
    new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      onPersist: async ({ document }) => {
        // Write the document to the database here.
      }
    }),
  ],
})

server.listen()
```

