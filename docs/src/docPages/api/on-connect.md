# onConnect

## toc

## Introduction

The `onConnect` hook will be called when a new connection is established. It should return a Promise. Throwing an exception or rejecting the Promise will terminate the connection.

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
  async onConnect(data) {
    const { requestParameters } = data

    // Example test if a user is authenticated using a
    // request parameter
    if (requestParameters.access_token !== 'super-secret-token') {
      throw new Error('Not authorized!')
    }

    // You can set contextual data to use it in other hooks
    return {
      user: {
        id: 1234,
        name: 'John',
      },
    }
  },
})

server.listen()
```
