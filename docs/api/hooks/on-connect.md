---
tableOfContents: true
---

# onConnect

## Introduction

The `onConnect` hook will be called when a new connection is established. It should return a Promise. Throwing an exception or rejecting the Promise will terminate the connection.

## Hook payload

The `data` passed to the `onConnect` hook has the following attributes:

```js
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Doc } from 'yjs'

const data = {
  documentName: string,
  instance: Hocuspocus,
  request: IncomingMessage,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: {
    readOnly: boolean,
  },
}
```

## Example

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onConnect(data) {
    // Output some information
    console.log(`New websocket connection`)
  },
})

server.listen()
```
