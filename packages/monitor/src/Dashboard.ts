import { IncomingMessage, ServerResponse } from 'http'
import WebSocket from 'ws'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createReadStream } from 'fs'

export interface Configuration {
  path: string,
}

export class Dashboard {

  configuration: Configuration = {
    path: './dashboard',
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

    if (request.url === path || request.url === `${path}/`) {
      const index = join(dirname(fileURLToPath(import.meta.url)), 'client', 'dist', 'index.html')

      response.writeHead(200, { 'Content-Type': 'text/html' })
      createReadStream(index).pipe(response)

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
