import { IncomingMessage, ServerResponse } from 'http'
import WebSocket from 'ws'

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

  handleRequest(request: IncomingMessage, response: ServerResponse): void {

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
