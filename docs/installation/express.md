---
tableOfContents: true
---

# Framework integration

## Introduction

hocuspocus can be used with any WebSocket implementation that uses `ws` under the hood. When you don't call `listen()` on Hocuspocus, it will not start a WebSocket server itself but rather relies on you calling it's `handleConnection()` method manually.

It requires the WebSocket connection instance as first argument, the HTTP request as second and the name of the document as third one.

Note: You have the choice to either use hocuspocus' `onConnect` hook or put your authorization and authentication code in your own upgrade connection handler and pass the `context` as fourth argument to the `handleConnection()` method.

## Express

To use Hocuspocus with [Express](https://expressjs.com), you need to use the `express-ws` package that adds WebSocket endpoints to Express applications. Then add a new WebSocket route and use hocuspocus' `handleConnection()` method to do the rest.

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

  server.handleConnection(websocket, request, request.params.document, context)
})

// Start the server
app.listen(1234, () => console.log('Listening on http://127.0.0.1:1234'))
```

## Extensions

Some extensions use the `onRequest`, `onUpgrade` and `onListen` hooks, that will not be fired in this scenario. Please read the docs of each extension on how to use them when integrating Hocuspocus in your framework of choice.
