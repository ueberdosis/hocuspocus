import express from 'express'
import expressWebsockets from 'express-ws'
import { Server } from '../packages/server/src'
import { Logger } from './utils/logger'

const server = Server.configure({
  extensions: [
    new Logger(),
  ],
})

const { app } = expressWebsockets(express())

app.get('/', (request, response) => {
  response.send('Hello World!')
})

app.ws('/collaboration/:document', (websocket, request: any) => {
  const context = { user_id: 1234 }
  server.handleConnection(websocket, request, context)
})

app.listen(1234, () => console.log('Listening on http://127.0.0.1:1234…'))
