import WebSocket from 'ws'
import { createServer, IncomingMessage, Server as HTTPServer } from 'http'
import { map } from 'lib0'
import { URLSearchParams } from 'url'
import { Configuration } from './types'
import Document from './Document'
import Connection from './Connection'

/**
 * Hocuspocus y-js websocket server
 */
class Hocuspocus {

  configuration: Configuration = {
    debounce: 3000,
    debounceMaxWait: 10000,
    onChange: () => null,
    onConnect: (data, resolve) => resolve(),
    onDisconnect: () => null,
    persistence: null,
    port: 80,
    timeout: 30000,
    external: false,
  }

  debounceStart: Map<string, number|null> = new Map()

  debounceTimeout: Map<string, NodeJS.Timeout> = new Map()

  documents = new Map()

  httpServer?: HTTPServer

  websocketServer?: WebSocket.Server

  /**
   * Constructor
   */
  constructor() {
    if (this.configuration.external) {
      return
    }

    this.httpServer = createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('OK')
    })

    this.websocketServer = new WebSocket.Server({ server: this.httpServer })
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
    if (!this.httpServer) {
      return
    }

    this.httpServer.listen(this.configuration.port, () => {
      console.log(`Listening on http://127.0.0.1:${this.configuration.port}`)
    })
  }

  /**
   * Handle the incoming websocket connection
   * @private
   */
  handleConnection(
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
      this.configuration.onConnect(hookPayload, resolve, reject)
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
  private handleDocumentUpdate(document: Document, update: Uint8Array, request: IncomingMessage): void {
    if (!this.configuration.debounce) {
      return this.saveDocument(document, update, request)
    }

    const { name } = document

    if (!this.debounceStart.get(name)) {
      this.debounceStart.set(name, this.now())
    }

    // @ts-ignore
    if (this.now() - this.debounceStart.get(name) >= this.configuration.debounceMaxWait) {
      this.debounceStart.set(name, null)
      return this.saveDocument(document, update, request)
    }

    if (this.debounceTimeout.get(name)) {
      // @ts-ignore
      clearTimeout(this.debounceTimeout.get(name))
    }

    this.debounceTimeout.set(name, setTimeout(
      () => this.saveDocument(document, update, request),
      this.debounceDuration,
    ))
  }

  /**
   * Save the given document using the configured persistence
   * and execute the configured onChange hook
   * @private
   */
  private saveDocument(document: Document, update: Uint8Array, request:IncomingMessage): void {
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
