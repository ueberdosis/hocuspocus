# onRequest

## toc

## Introduction

The `onRequest` hook is called when the HTTP server inside hocuspocus receives a new request. It should return a Promise. If you throw an empty exception or reject the returned Promise the following hooks in the chain will not run and thus enable you to respond to the request yourself. It's similar to the concept of request middlewares.

This is useful if you want to create custom routes on the same port hocuspocus runs on.

## Hook payload

The `data` passed to the `onRequest` hook has the following attributes:

```typescript
import { IncomingMessage, ServerResponse } from 'http'

const data = {
  request: IncomingMessage,
  response: ServerResponse,
}
```

## Example

```typescript
import { Server } from '@hocuspocus/server'

const hocuspocus = Server.configure({
  onRequest(data) {
    return new Promise((resolve, reject) => {
      const { request, response } = data

      // Check if the request hits your custom route
      if(request.url?.split('/')[1] === 'custom-route') {

        // Respond with your custum content
        response.writeHead(200, { 'Content-Type': 'text/plain' })
        response.end('This is my custom response, yay!')

        // Rejecting the promise will stop the chain and no further
        // onRequest hooks are run
        return reject()
      }

      resolve()
    })
  },
})

hocuspocus.listen()
```
