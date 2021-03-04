# onDisconnect

## toc

## Introduction

The `onDisconnect` hook is called when a connection is terminated. It should return a Promise.

## Hook payload

The `data` passed to the `onDisconnect` hook has the following attributes:

```typescript
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Doc } from 'yjs'

const data = {
  clientsCount: number,
  document: Doc,
  documentName: string,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  update: Uint8Array,
}
```

## Example

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  async onDisconnect(data) {
    // Output some information
    process.stdout.write(`"${data.context.user.name}" has disconnected!`)
  },
})

hocuspocus.listen()
```
