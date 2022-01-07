---
tableOfContents: true
---

# Redis

## Introduction
This extension allows horizontal scaling of Hocuspocus instances, allowing any
client to connect to any instance and share document state and awareness states between them.

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
    }),
  ],
})

server.listen()
```

