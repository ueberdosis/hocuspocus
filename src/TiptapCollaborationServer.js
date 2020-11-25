import { createServer } from 'http'
import WebSocket from 'ws'
import { setupWSConnection } from './bin/utils.js'

class Server {

  configuration = {
    port: 8080,
  }

  server = null
  websocketServer = null

  constructor() {
    this.server = createServer((request, response) => {
      response.writeHead(200, {'Content-Type': 'text/plain'})
      response.end('OK')
    })

    this.websocketServer = new WebSocket.Server({server: this.server})
    this.websocketServer.on('connection', (connection, request) => {
      this.log(`New connection to ${request.url}`)

      return setupWSConnection(connection, request)
    })
  }

  create(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration
    }

    return this
  }

  listen() {
    this.server.listen(this.configuration.port, () => {
      this.log(`Listening on: ${this.configuration.port}`)
    })
  }

  log(message) {
    console.log('\x1b[32m%s\x1b[0m', '🚀 [TiptapCollaborationServer]', message)
  }
}

export const TiptapCollaborationServer = new Server
