import express from 'express'
import expressWebsockets from 'express-ws'
import WebSocket from 'ws'
import { Server, onChangePayload, onDisconnectPayload } from '@hocuspocus/server/src'

/*
 * Setup the collaborative editing backend and set external to true
 *
 * Note: the onConnect hook will not fire because you are handling
 * connections and authorization inside the express-ws handler
 */
const server = Server.configure({
  external: true,

  onChange(data: onChangePayload) {
    // do something with the data
  },

  onDisconnect(data: onDisconnectPayload) {
    // handle disconnect
  },
})

/*
 * Setup your express instance using the express-ws extension
 */
const { app } = expressWebsockets(express())

app.get('/', (request: any, response:any) => {
  response.send('Hello World!')
})

/*
 * Add a websocket route for the collaborative editing backend
 *
 * Note: make sure to include a parameter for the document name.
 * You can set any contextual data like in the onConnect hook
 * and pass it to the handleConnection method.
 */
app.ws('/collaboration/:document', (websocket: WebSocket, request: any) => {
  const context = { user_id: 1234 }
  server.handleConnection(websocket, request, context)
})

/*
 * Start the server
 */
app.listen(1234, () => console.log('Listening on http://127.0.0.1:1234'))
