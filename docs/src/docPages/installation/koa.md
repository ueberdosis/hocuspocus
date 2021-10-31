# Koa

## toc

## Introduction
TODO

## Usage
TODO

```js
import Koa from 'koa'
import websocket from 'koa-easy-ws'
import { Server } from '../../../packages/server/src'
import { Logger } from '../../../packages/extension-logger/src'

// Configure hocuspocus
const server = Server.configure({
  // …
})

const app = new Koa()

// Setup your koa instance using the koa-easy-ws extension
app.use(websocket())

// Add a websocket route for hocuspocus
// Note: make sure to include a parameter for the document name.
// You can set any contextual data like in the onConnect hook
// and pass it to the handleConnection method.
app.use(async (ctx, next) => {
  const ws = await ctx.ws()
  const documentName = ctx.request.path.substring(1)

  server.handleConnection(
    ws,
    ctx.request,
    documentName,
    // additional data (optional)
    {
      user_id: 1234,
    },
  )
})

// Start the server
app.listen(1234)
```

## Extensions
Some extensions use the `onRequest`, `onUpgrade` and `onListen` hooks, that will not be fired in this scenario. Please read the docs of each extension on how to use them when integrating Hocuspocus in your framework of choice.
