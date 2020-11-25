import WebSocket from 'ws'
import {createServer} from 'http'
import {setupWSConnection} from './bin/utils.js'

class Server {

  configuration = {
    port: 8080,
    debounce: true,
  }

  httpServer = null
  websocketServer = null

  /**
   * Initialize
   */
  constructor() {
    this.httpServer = createServer((request, response) => {
      response.writeHead(200, {'Content-Type': 'text/plain'})
      response.end('OK')
    })

    this.websocketServer = new WebSocket.Server({
      server: this.httpServer
    })

    this.websocketServer.on('connection', this._handleConnection.bind(this))
  }

  /**
   * Configure the server
   * @param configuration
   * @returns {Server}
   */
  create(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration
    }

    return this
  }

  /**
   * Start the server
   */
  listen() {
    this.httpServer.listen(this.configuration.port, () => {
      this._log(`Listening on: ${this.configuration.port}`)
    })
  }

  /**
   * Handle an incoming connection request
   * @param connection
   * @param request
   * @private
   */
  _handleConnection(connection, request) {
    this._log(`New connection to ${request.url}`)

    return setupWSConnection(connection, request)
  }

  /**
   * Log messages to console
   * @param message
   */
  _log(message) {
    console.log('\x1b[32m%s\x1b[0m', '🚀 [TiptapCollaborationServer]', message)
  }
}

export const TiptapCollaborationServer = new Server
