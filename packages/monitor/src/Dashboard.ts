import { IncomingMessage, ServerResponse } from 'http'
import WebSocket from 'ws'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Server } from 'node-static'

export interface Configuration {
  path: string,
}

export class Dashboard {

  configuration: Configuration = {
    path: 'dashboard',
  }

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
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

  handleWebsocketConnection(websocket: WebSocket, request: IncomingMessage): void {

  }

  listen() {
    // this.ws.on('connection', ws => {
    //   ws.on('message', message => {
    //     console.log('received: %s', message)
    //   })
    //
    //   ws.send('something')
    // })
    //
    // this.http.listen()
  }

}
