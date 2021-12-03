---
tableOfContents: true
---

# onDisconnect

## Introduction

The `onDisconnect` hook is called when a connection is terminated. It should return a Promise.

## Hook payload

The `data` passed to the `onDisconnect` hook has the following attributes:

```js
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Doc } from 'yjs'

const data = {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string
}
```

Context contains the data provided in former `onConnect` hooks.

## Example

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onDisconnect(data) {
    // Output some information
    console.log(`"${data.context.user.name}" has disconnected.`)
  },
})

server.listen()
```
