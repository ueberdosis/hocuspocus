# Authentication & Authorization

With the `onConnect` hook you can check if a client is authenticated and authorized to view the current document. That can be a request to an API, to a microservice, a database query, or whatever is needed, as long as it’s executing `resolve()` at some point. You can also pass contextual data to the `resolve()` method which will be accessible in other hooks.

Calling `reject()` will terminate the connection.

```typescript
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  onConnect(data, resolve, reject) {
    const { requestParameters } = data

    // Example test if a user is authenticated using a
    // request parameter
    if (requestParameters.access_token !== 'super-secret-token') {
       return reject()
    }

    // You can set contextual data
    const context = {
        user: {
            id: 1234,
            name: 'John',
        },
    }

    // And pass it along to use in other hooks
    resolve(context)
  },
})

server.listen()
```

The `data` passed to the `onConnect` hook has the following attributes:

```typescript
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Document } from '@hocuspocus/server'

const data = {
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  clientsCount: number,
  document: Document,
  documentName: string,
}
```
