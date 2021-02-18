# onDisconnect

## toc

## Introduction

The `onDisconnect` hook is called when a connection is terminated.

## Hook payload

The `data` passed to the `onDisconnect` hook has the following attributes:

```typescript
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Doc } from 'yjs'

const data = {
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  clientsCount: number,
  document: Doc,
  documentName: string,
  update: Uint8Array,
}
```

## Example

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  onDisconnect(data) {
    // Output some information
    process.stdout.write(`"${data.context.user.name}" has disconnected!`)
  },
})

hocuspocus.listen()
```
