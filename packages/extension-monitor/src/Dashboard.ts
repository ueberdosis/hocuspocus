import { createServer, IncomingMessage, ServerResponse } from 'http'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Socket } from 'net'
import process from 'process'
import staticHandler from 'serve-handler'
import WebSocket, { WebSocketServer } from 'ws'
import { Storage } from './Storage'

export interface Configuration {
  password: string | undefined,
  path: string,
  port: number | undefined,
  storage: Storage | undefined,
  user: string | undefined,
}

export class Dashboard {

  configuration: Configuration = {
    password: undefined,
    path: 'dashboard',
    port: undefined,
    storage: undefined,
    user: undefined,
  }

  websocketServer: WebSocketServer

  connections: Map<WebSocket, any> = new Map()

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    // subscribe to storage additions and send them to the client
    this.configuration.storage?.on('add', data => {
      this.send(JSON.stringify({ event: 'add', data: [data] }))
    })

    this.configuration.storage?.on('set', data => {
      this.send(JSON.stringify({ event: 'set', data }))
    })

    this.websocketServer = new WebSocketServer({ noServer: true })
    this.websocketServer.on('connection', this.handleConnection.bind(this))

    if (this.configuration.port) {
      this.createServer()
    }
  }

  createServer(): void {
    const { port, path } = this.configuration

    const server = createServer((request, response) => {
      if (!this.handleRequest(request, response)) {
        response.writeHead(404)
        response.end('Not Found')
      }
    })

    server.on('upgrade', (request, socket, head) => {
      // TODO: Argument of type 'Duplex' is not assignable to parameter of type 'Socket'.
      // @ts-ignore
      this.handleUpgrade(request, socket, head)
    })

    server.listen(port, () => process.stdout.write(
      `[${(new Date()).toISOString()}] Dashboard listening: http://0.0.0.0:${port}/${path}" … \n`,
    ))
  }

  handleRequest(request: IncomingMessage, response: ServerResponse): boolean {
    const { path } = this.configuration

    if (request.url?.split('/')[1] === path) {
      if (this.basicAuth(request, response)) {
        return true
      }

      request.url = request.url.replace(path, '')

      const publicPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'dashboard', 'dist')

      request.addListener('end', () => staticHandler(request, response, { public: publicPath })).resume()

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

  handleConnection(connection: WebSocket, request: IncomingMessage): void {
    this.connections.set(connection, {})

    if (this.configuration.storage) {
      this.sendInitialDataToClient(connection)
    }

    connection.on('close', () => {
      this.close(connection)
    })
  }

  close(connection: WebSocket): void {
    this.connections.delete(connection)
    connection.close()
  }

  send(message: string) {
    this.connections.forEach((value, connection) => {
      if (connection.readyState === 2 || connection.readyState === 3) {
        return
      }

      try {
        connection.send(message, (error: any) => {
          if (error != null) this.close(connection)
        })
      } catch (exception) {
        this.close(connection)
      }
    })
  }

  private async sendInitialDataToClient(connection: WebSocket) {
    const timed = await this.configuration.storage?.allTimed() || []
    const constant = await this.configuration.storage?.all()

    setTimeout(() => {

      connection.send(JSON.stringify({ event: 'add', data: timed }))
      constant.forEach((data: any) => connection.send(JSON.stringify({ event: 'set', data })))

    }, 1000)
  }

  private basicAuth(request: IncomingMessage, response: ServerResponse) {
    if (!this.configuration.user || !this.configuration.password) {
      return false
    }

    const header = request.headers.authorization || ''
    const token = header.split(/\s+/).pop() || ''
    const auth = Buffer.from(token, 'base64').toString()
    const parts = auth.split(/:/)

    const username = parts.shift()
    const password = parts.join(':')

    if (this.configuration.user !== username || this.configuration.password !== password) {
      response.writeHead(401, 'Unauthorized', ['WWW-Authenticate', 'Basic realm="@hocuspocus/monitor"'])
      response.end()

      return true
    }

    return false
  }
}
