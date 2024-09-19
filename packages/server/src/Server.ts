import {
  createServer, IncomingMessage, Server as HTTPServer, ServerResponse,
} from 'http'
import WebSocket, { ServerOptions, WebSocketServer } from 'ws'
import { Hocuspocus } from './Hocuspocus.js'

export class Server {
  httpServer: HTTPServer

  webSocketServer: WebSocketServer

  hocuspocus: Hocuspocus

  constructor(hocuspocus: Hocuspocus, websocketOptions: ServerOptions = {}) {
    this.hocuspocus = hocuspocus
    this.httpServer = createServer(this.requestHandler)
    this.webSocketServer = new WebSocketServer({ noServer: true, ...websocketOptions })

    this.setupWebsocketConnection()
    this.setupHttpUpgrade()
  }

  setupWebsocketConnection = () => {
    this.webSocketServer.on('connection', async (incoming: WebSocket, request: IncomingMessage) => {

      incoming.on('error', error => {
        /**
         * Handle a ws instance error, which is required to prevent
         * the server from crashing when one happens
         * See https://github.com/websockets/ws/issues/1777#issuecomment-660803472
         * @private
         */
        this.hocuspocus.debugger.log('Error emitted from webSocket instance:')
        this.hocuspocus.debugger.log(error)
      })

      this.hocuspocus.handleConnection(incoming, request)
    })
  }

  setupHttpUpgrade = () => {
    this.httpServer.on('upgrade', async (request, socket, head) => {
      try {
        await this.hocuspocus.hooks('onUpgrade', {
          request,
          socket,
          head,
          instance: this.hocuspocus,
        })

        // let the default websocket server handle the connection if
        // prior hooks don't interfere
        this.webSocketServer.handleUpgrade(request, socket, head, ws => {
          this.webSocketServer.emit('connection', ws, request)
        })
      } catch (error) {
        // if a hook rejects and the error is empty, do nothing
        // this is only meant to prevent later hooks and the
        // default handler to do something. if a error is present
        // just rethrow it

        // TODO: why?
        if (error) {
          throw error
        }
      }
    })
  }

  requestHandler = async (request: IncomingMessage, response: ServerResponse) => {
    try {
      await this.hocuspocus.hooks('onRequest', { request, response, instance: this.hocuspocus })

      // default response if all prior hooks don't interfere
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('OK')
    } catch (error) {
      // if a hook rejects and the error is empty, do nothing
      // this is only meant to prevent later hooks and the
      // default handler to do something. if a error is present
      // just rethrow it
      if (error) {
        throw error
      }
    }
  }
}
