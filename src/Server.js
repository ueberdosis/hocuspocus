import Connection from './Connection.js'
import SharedDocument from './SharedDocument.js'
import map from "lib0/dist/map.cjs"
import WebSocket from 'ws'
import {createServer} from 'http'

class Server {

  configuration = {
    debounce: true,
    port: 8080,
    timeout: 30000,
  }

  httpServer
  websocketServer
  documents = new Map()

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

    this.websocketServer.on('connection', (connection, request) => {
      console.log(`New connection to ${request.url}`)

      return this._createConnection(connection, request, this._createDocument(request))
    })
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
      console.log(`Listening on http://127.0.0.1:${this.configuration.port}`)
    })
  }

  /**
   * Create a new document by the given request
   * @param request
   * @private
   */
  _createDocument(request) {
    const documentName = request.url.slice(1).split('?')[0]


    return map.setIfUndefined(this.documents, documentName, () => {
      const document = new SharedDocument(documentName)

      // TODO: persistence
      // if (persistence !== null) {
      //   persistence.bindState(docname, doc)
      // }

      this.documents.set(documentName, document)

      return document
    })
  }

  /**
   *
   * @param connection
   * @param request
   * @param document
   * @returns {Connection}
   * @private
   */
  _createConnection(connection, request, document) {
    return new Connection(connection, request, document, this.configuration.timeout)
      .onClose((document) => {
        if (document.connections.size === 0) {
          this.documents.delete(document.name)
        }
      })
  }
}

export const TiptapCollaborationServer = new Server
