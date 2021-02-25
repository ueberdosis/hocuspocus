# Framework integration

## toc

## Introduction

hocuspocus can be used with any WebSocket implementation that uses `ws` under the hood. When you don't call `listen()` on hocuspocus, it will not start a WebSocket server itself but rather relies on you calling it's `handleConnection()` method manually.

It requires the WebSocket connection instance as first argument, the HTTP request as second, and the context as used in the `onConnect` hook as third.

Note: the `onConnect` hook will not fire because you are handling connections yourself. So you need to put your authorization and authentication code in your own upgrade connection handler.

## Express

To use hocuspocus with [Express](https://expressjs.com), you need to use the `express-ws` package that adds WebSocket endpoints to Express applications. Then add a new WebSocket route and use hocuspocus' `handleConnection()` method to do the rest.

```typescript
import express from 'express'
import expressWebsockets from 'express-ws'
import { Server } from '@hocuspocus/server'

// Configure hocuspocus
const server = Server.configure({
  // ...
})

// Setup your express instance using the express-ws extension
const { app } = expressWebsockets(express())

// A basic http route
app.get('/', (request, response) => {
  response.send('Hello World!')
})

// Add a websocket route for hocuspocus
// Note: make sure to include a parameter for the document name.
// You can set any contextual data like in the onConnect hook
// and pass it to the handleConnection method.
app.ws('/collaboration/:document', (websocket, request) => {
  const context = {
    user: {
      id: 1234,
      name: 'Jane',
    },
  }

  server.handleConnection(websocket, request, context)
})

// Start the server
app.listen(1234, () => console.log('Listening on http://127.0.0.1:1234'))
```

## Extensions

// TODO
