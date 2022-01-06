---
tableOfContents: true
---

# onUpgrade

## Introduction

The `onUpgrade` hook is called when the HTTP server inside Hocuspocus receives a new upgrade request. It should return a Promise. If you throw an empty exception or reject the returned Promise the following hooks in the chain will not run and thus enable you to respond and upgrade the request yourself. It's similar to the concept of request middlewares.

This is useful if you want to create custom websocket routes on the same port Hocuspocus runs on.

## Hook payload

The `data` passed to the `onUpgrade` hook has the following attributes:

```js
import { IncomingMessage } from 'http'
import { Socket } from 'net'

const data = {
  head: any,
  request: IncomingMessage,
  socket: Socket,
  instance: Hocuspocus,
}
```

## Example

```js
import { Server } from '@hocuspocus/server'
import WebSocket, { WebSocketServer } from 'ws'

const server = Server.configure({
  onUpgrade(data) {
    return new Promise((resolve, reject) => {
      const { request, socket, head } = data

      // Check if the request hits your custom route
      if(request.url?.split('/')[1] === 'custom-route') {

        // Create your own websocket server to upgrade the request, make
        // sure noServer is set to true, because we're handling the upgrade
        // ourselves
        const websocketServer = new WebSocketServer({ noServer: true })
        websocketServer.on('connection', (connection: WebSocket, request: IncomingMessage) => {
          // Put your application logic here to respond to new connections
          // and subscribe to incoming messages
          console.log('A new connection to our websocket server!')
        })

        // Handle the upgrade request within your own websocket server
        websocketServer.handleUpgrade(request, socket, head, ws => {
          websocketServer.emit('connection', ws, request)
        })

        // Rejecting the promise will stop the chain and no further
        // onUpgrade hooks are run
        return reject()
      }

      resolve()
    })
  },
})

server.listen()
```
