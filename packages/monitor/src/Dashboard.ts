import { createServer, IncomingMessage, ServerResponse } from 'http'
import WebSocket from 'ws'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Server } from 'node-static'
import { Socket } from 'net'

export interface Configuration {
  path: string,
  port: number | undefined,
}

export class Dashboard {

  configuration: Configuration = {
    path: 'dashboard',
    port: undefined,
  }

  websocketServer: WebSocket.Server

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.websocketServer = new WebSocket.Server({ noServer: true })
    this.websocketServer.on('connection', this.handleConnection.bind(this))

    if (this.configuration.port) {
      const server = createServer((request, response) => {
        if (!this.handleRequest(request, response)) {
          response.writeHead(404)
          response.end('Not Found')
        }
      })

      server.on('upgrade', (request, socket, head) => {
        this.handleUpgrade(request, socket, head)
      })

      server.listen(this.configuration.port, () => {
        process.stdout.write(`[${(new Date()).toISOString()}] Dashboard listening on port "${this.configuration.port}" … \n`)
      })
    }
  }

  handleRequest(request: IncomingMessage, response: ServerResponse): boolean {
    const { path } = this.configuration

    if (request.url?.split('/')[1] === path) {
      request.url = request.url.replace(path, '')

      const publicPath = join(dirname(fileURLToPath(import.meta.url)), 'client', 'public')
      const server = new Server(publicPath, { cache: 0 })

      request.addListener('end', () => server.serve(request, response)).resume()

      return true
    }

    return false
  }

  handleUpgrade(request: IncomingMessage, socket: Socket, head: any) {
    const { path } = this.configuration

    if (request.url?.split('/')[1] === path) {
      this.websocketServer.handleUpgrade(request, socket, head, ws => {
        this.websocketServer.emit('connection', ws, request)
      })

      return true
    }

    return false
  }

  handleConnection(websocket: WebSocket, request: IncomingMessage): void {
    console.log('connected yay')
  }
}
