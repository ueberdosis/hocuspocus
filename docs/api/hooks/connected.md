---
tableOfContents: true
---

# connected

## Introduction
The `connected` hook is called after a new connection has been successfully established.

## Example
```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async connected() {
    console.log('connections:', server.getConnectionsCount())
  },
})

server.listen()
```
