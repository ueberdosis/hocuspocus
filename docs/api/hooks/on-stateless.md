---
tableOfContents: true
---

# onStateless

## Introduction

The `onStateless` hooks are called after the server has received a stateless message. It should return a Promise.

## Hook payload

The `data` passed to the `onListen` hook has the following attributes:

```js
const data = {
  connection: Connection,
  documentName: string,
  document: Document,
  payload: string,
}
```

## Example

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onStateless({ payload, document, connection }) {
    // Output some information
    console.log(`Server has received a stateless message "${payload}"!`)
    // Broadcast a stateless message to all connections based on document
    document.broadcastStateless('This is a broadcast message.')
    // Send a stateless message to a specific connection
    connection.sendStateless('This is a specific message.')
  },
})

server.listen()
```
