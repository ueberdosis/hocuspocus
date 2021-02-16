# onConnect

## toc

## Introduction

The `onConnect` hook will be called when a new connection is established. It accepts a `resolve()` and `reject()` method that allow you to either keep the connection alive or terminate it.

## Hook payload

The `data` passed to the `onConnect` hook has the following attributes:

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
}
```

## Example

```typescript
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  onConnect(data, resolve, reject) {
    const { requestParameters } = data

    // Example test if a user is authenticated using a
    // request parameter, reject terminates the connection
    if (requestParameters.access_token !== 'super-secret-token') {
       return reject()
    }

    // You can set contextual data…
    const context = {
        user: {
            id: 1234,
            name: 'John',
        },
    }

    // …and pass it along to use it in other hooks
    // resolve will keep the connection alive
    resolve(context)
  },
})

server.listen()
```
