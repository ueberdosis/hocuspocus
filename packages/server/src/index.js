import map from 'lib0/dist/map.cjs'
import WebSocket from 'ws'
import { createServer } from 'http'
import debounce from 'lodash.debounce'
import Document from './Document.js'
import Connection from './Connection.js'

class Hocuspocus {

  configuration = {

    debounce: true,
    debounceMaxWait: 10000,
    httpServer: null,
    persistence: null,
    port: 80,
    timeout: 30000,

    onChange: (data, resolve) => resolve(),
    onConnect: (data, resolve) => resolve(),
    onJoinDocument: (data, resolve) => resolve(),

  }

  httpServer

  websocketServer

  documents = new Map()

  /**
   * Constructor
   */
  constructor() {
    this.httpServer = this.configuration.httpServer
      ? this.configuration.httpServer
      : createServer((request, response) => {
        response.writeHead(200, { 'Content-Type': 'text/plain' })
        response.end('OK')
      })

    this.websocketServer = new WebSocket.Server({ noServer: true })

    this.httpServer.on('upgrade', this.handleUpgrade.bind(this))
    this.websocketServer.on('connection', this.handleConnection.bind(this))
  }

  /**
   * Configure the server
   * @param configuration
   * @returns {Hocuspocus}
   */
  configure(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
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
   * Handle upgrade request
   * @param request
   * @param socket
   * @param head
   * @private
   */
  handleUpgrade(request, socket, head) {
    const data = {
      requestHeaders: request.headers,
    }

    new Promise((resolve, reject) => {
      this.configuration.onConnect(data, resolve, reject)
    })
      .then(context => {
        this.websocketServer.handleUpgrade(request, socket, head, connection => {
          this.websocketServer.emit('connection', connection, request, context)
        })
      })
      .catch(() => {
        this.websocketServer.handleUpgrade(request, socket, head, connection => {
          connection.close()
          console.log('unauthenticated')
        })
      })
  }

  /**
   * Handle the incoming connection
   * @param incoming
   * @param request
   * @param context
   * @private
   */
  handleConnection(incoming, request, context = null) {
    console.log(`New connection to ${request.url}`)

    const document = this.createDocument(request)
    const connection = this.createConnection(incoming, request, document, context)

    const data = {
      clientsCount: document.connectionsCount(),
      context,
      document,
      documentName: document.name,
      requestHeaders: request.headers,
    }

    new Promise((resolve, reject) => {
      this.configuration.onJoinDocument(data, resolve, reject)
    })
      .catch(() => {
        connection.close()
        console.log(`Connection to ${request.url} was terminated by script`)
      })
  }

  /**
   * Create a new document by the given request
   * @param request
   * @private
   */
  createDocument(request) {
    const documentName = request.url.slice(1).split('?')[0]

    return map.setIfUndefined(this.documents, documentName, () => {
      const document = new Document(documentName)

      const debounceDuration = isNaN(this.configuration.debounce)
        ? 2000
        : this.configuration.debounce

      document.onUpdate(document => {
        const data = {
          clientsCount: document.connectionsCount(),
          document,
          documentName: document.name,
          requestHeaders: request.headers,
        }

        if (!this.configuration.debounce) {
          return this.configuration.onChange(data)
        }

        // TODO: WHY U NOT WORKING?
        // debounce(
        //   () => { this.configuration.onChange(data) },
        //   debounceDuration,
        //   { maxWait: this.configuration.debounceMaxWait },
        // )
      })

      if (this.configuration.persistence) {
        this.configuration.persistence.connect(documentName, document)
      }

      this.documents.set(documentName, document)

      return document
    })
  }

  /**
   * Create a new connection by the given request and document
   * @param connection
   * @param request
   * @param document
   * @param context
   * @returns {Connection}
   * @private
   */
  createConnection(connection, request, document, context = null) {
    return new Connection(
      connection,
      request,
      document,
      this.configuration.timeout,
      context,
    )
      .onClose(document => {
        if (document.connectionsCount() > 0 || this.configuration.persistence === null) {
          return
        }

        this.configuration.persistence.store(document.name, document).then(() => {
          console.log(`Document ${document.name} stored.`)
          document.destroy()
        })

        this.documents.delete(document.name)
      })
  }
}

export const Server = new Hocuspocus()
