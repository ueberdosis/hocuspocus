---
tableOfContents: true
---

# onConnect

## Introduction

The `onConnect` hook will be called when a new connection is established. It should return a Promise. Throwing an exception or rejecting the Promise will terminate the connection.

## Hook payload

The `data` passed to the `onConnect` hook has the following attributes:

```typescript
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

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  async onConnect(data) {
    // Output some information
    process.stdout.write(`New websocket connection`)
  },
})

hocuspocus.listen()
```
