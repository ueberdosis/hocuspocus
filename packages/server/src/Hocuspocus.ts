import { map } from 'lib0'
import WebSocket from 'ws'
import { URLSearchParams } from 'url'
import { Socket } from 'net'
import { createServer, Server as HTTPServer, IncomingMessage } from 'http'
import Document from './Document'
import Connection from './Connection'
import { Configuration } from './types'

/**
 * Hocuspocus y-js websocket server
 */
class Hocuspocus {

  configuration: Configuration = {
    debounce: 0,
    debounceMaxWait: 10000,
    httpServer: createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('OK')
    }),
    onChange: () => null,
    onConnect: (data, resolve) => resolve(),
    onDisconnect: () => null,
    onJoinDocument: (data, resolve) => resolve(),
    persistence: null,
    port: 80,
    timeout: 30000,
  }

  debounceStart!: number | null

  debounceTimeout!: NodeJS.Timeout

  documents = new Map()

  httpServer: HTTPServer

  websocketServer: WebSocket.Server

  /**
   * Constructor
   */
  constructor() {
    this.httpServer = this.configuration.httpServer
    this.websocketServer = new WebSocket.Server({ noServer: true })

    this.httpServer.on('upgrade', this.handleUpgrade.bind(this))
    this.websocketServer.on('connection', this.handleConnection.bind(this))
  }

  /**
   * Configure the server
   */
  configure(configuration: Partial<Configuration>): Hocuspocus {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    return this
  }

  /**
   * Start the server
   */
  listen(): void {
    this.httpServer.listen(this.configuration.port, () => {
      console.log(`Listening on http://127.0.0.1:${this.configuration.port}`)
    })
  }

  /**
   * Handle upgrade request
   * @private
   */
  private handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void {
    console.log(`Connection request for ${request.url}`)

    const hookPayload = {
      requestHeaders: request.headers,
      requestParameters: this.getParameters(request),
    }

    this.websocketServer.handleUpgrade(request, socket, head, connection => {
      new Promise((resolve, reject) => {
        this.configuration.onConnect(hookPayload, resolve, reject)
      })
        .then(context => {
          this.websocketServer.emit('connection', connection, request, context)
        })
        .catch(() => {
          connection.close()
          console.log(`Unauthenticated request to ${request.url}`)
        })
    })
  }

  /**
   * Handle the incoming websocket connection
   * @private
   */
  private handleConnection(
    incoming: WebSocket,
    request: IncomingMessage,
    context: any = null,
  ): void {
    const document = this.createDocument(request)
    const connection = this.createConnection(incoming, request, document, context)

    const hookPayload = {
      clientsCount: document.connectionsCount(),
      context,
      document,
      documentName: document.name,
      requestHeaders: request.headers,
      requestParameters: this.getParameters(request),
    }

    new Promise((resolve, reject) => {
      this.configuration.onJoinDocument(hookPayload, resolve, reject)
    })
      .then(() => {
        console.log(`Connection established to ${request.url}`)
      })
      .catch(() => {
        connection.close()
        console.log(`Connection to ${request.url} was refused`)
      })
  }

  /**
   * Handle update of the given document
   */
  private handleDocumentUpdate(document: Document, update: any, request: IncomingMessage): void {
    if (!this.configuration.debounce) {
      return this.saveDocument(document, update, request)
    }

    if (!this.debounceStart) {
      this.debounceStart = this.now()
    }

    if (this.now() - this.debounceStart >= this.configuration.debounceMaxWait) {
      this.debounceStart = null
      return this.saveDocument(document, update, request)
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.debounceTimeout = setTimeout(
      () => this.saveDocument(document, update, request),
      this.debounceDuration,
    )
  }

  /**
   * Save the given document using the configured persistence
   * and execute the configured onChange hook
   * @private
   */
  private saveDocument(document: Document, update: any, request:IncomingMessage): void {
    if (this.configuration.persistence) {
      this.configuration.persistence.store(document.name, update)
      console.log(`Document ${document.name} saved`)
    }

    this.configuration.onChange({
      clientsCount: document.connectionsCount(),
      document,
      documentName: document.name,
      requestHeaders: request.headers,
      requestParameters: this.getParameters(request),
    })
  }

  /**
   * Create a new document by the given request
   */
  private createDocument(request: IncomingMessage): Document {
    const documentName = request.url?.slice(1)?.split('?')[0] || ''

    return map.setIfUndefined(this.documents, documentName, () => {
      const document = new Document(documentName)

      document.onUpdate((document, update) => {
        this.handleDocumentUpdate(document, update, request)
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
   * @private
   */
  private createConnection(
    connection: WebSocket,
    request: IncomingMessage,
    document: Document,
    context = null,
  ): Connection {
    return new Connection(
      connection,
      request,
      document,
      this.configuration.timeout,
      context,
    )
      .onClose(document => {

        this.configuration.onDisconnect({
          clientsCount: document.connectionsCount(),
          context,
          document,
          documentName: document.name,
          requestHeaders: request.headers,
          requestParameters: this.getParameters(request),
        })

        if (document.connectionsCount() > 0) {
          return
        }

        this.documents.delete(document.name)
      })
  }

  /**
   * Get the current process time in milliseconds
   */
  now(): number {
    const hrTime = process.hrtime()
    return Math.round(hrTime[0] * 1000 + hrTime[1] / 1000000)
  }

  /**
   * Get parameters by the given request
   */
  getParameters(request: IncomingMessage): URLSearchParams {
    const query = request?.url?.split('?') || []

    return new URLSearchParams(query[1] ? query[1] : '')
  }

  /**
   * Get debounce duration
   */
  get debounceDuration(): number {
    return Number.isNaN(this.configuration.debounce)
      ? 2000
      : this.configuration.debounce
  }
}

export const Server = new Hocuspocus()
