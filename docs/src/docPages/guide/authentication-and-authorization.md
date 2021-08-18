# Authentication & Authorization

## toc

## Introduction

With the `onConnect` hook you can check if a client is authenticated and authorized to view the current document. In a real world application this would probably be a request to an API, a database query or something else.

## Example

When throwing an error (or rejecting the returned Promise), the connection to the client will be terminated. If the client is authorized and authenticated you can also return contextual data which will be accessible in other hooks. But you don't need to.

For more information on the hook and it's payload checkout it's [API section](/api/on-connect).

```typescript
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onConnect(data) {
    const { requestParameters } = data

    // Example test if a user is authenticated using a
    // request parameter
    if (requestParameters.get('access_token') !== 'super-secret-token') {
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
