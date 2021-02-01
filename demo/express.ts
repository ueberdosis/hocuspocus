import express from 'express'
import expressWebsockets from 'express-ws'
import WebSocket from 'ws'
import { Server } from '@hocuspocus/server'

/*
 * Setup the collaborative editing backend and set external to true
 *
 * Note: the onConnect hook will not fire because you are handling
 * connections and authorization inside the express-ws handler
 */
const server = Server.configure({
  external: true,

  onChange(data) {
    // do something with the data
  },

  onDisconnect(data) {
    // handle disconnect
  },
})

/*
 * Setup your express instance using the express-ws extension
 */
const { app } = expressWebsockets(express())

app.get('/', (request, response) => {
  response.send('Hello World!')
})

/*
 * Add a websocket route for the collaborative editing backend
 *
 * Note: make sure to include a parameter for the document name.
 * You can set any contextual data like in the onConnect hook
 * and pass it to the handleConnection method.
 */
app.ws('/collaboration/:document', (websocket, request: any) => {
  const context = { user_id: 1234 }
  server.handleConnection(websocket, request, context)
})

/*
 * Start the server
 */
app.listen(1234, () => console.log('Listening on http://127.0.0.1:1234'))
