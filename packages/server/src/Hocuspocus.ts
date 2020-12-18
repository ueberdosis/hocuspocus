import { map } from 'lib0'
import WebSocket from 'ws'
import { URLSearchParams } from 'url'
import { Socket } from 'net'
import { createServer, Server as HTTPServer, IncomingMessage } from 'http'
import Document from './Document'
import Connection from './Connection'

interface Configuration {
  debounce: number,
  debounceMaxWait: number,
  httpServer: HTTPServer,
  persistence: any,
  port: number,
  timeout: number,
  onChange: (data: any) => void,
  onConnect: (data: any, resolve: Function, reject: Function) => void,
  onDisconnect: (data: any) => void,
  onJoinDocument: (data: any, resolve: Function, reject: Function) => void,
}

class Hocuspocus {

  configuration: Configuration = {
    debounce: 0,
    debounceMaxWait: 10000,
    httpServer: createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('OK')
    }),
    persistence: null,
    port: 80,
    timeout: 30000,
    onChange: () => null,
    onConnect: (data, resolve: any) => resolve(),
    onDisconnect: data => null,
    onJoinDocument: (data, resolve) => resolve(),
  }

  httpServer: HTTPServer

  websocketServer: WebSocket.Server

  documents = new Map()

  debounceTimeout!: NodeJS.Timeout

  debounceStart!: number | null

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
   * @param configuration
   * @returns {Hocuspocus}
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
   * @param request
   * @param socket
   * @param head
   * @private
   */
  handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer): void {
    const data = {
      requestHeaders: request.headers,
      requestParameters: this.getParameters(request),
    }

    this.websocketServer.handleUpgrade(request, socket, head, connection => {

      new Promise((resolve, reject) => {
        this.configuration.onConnect(data, resolve, reject)
      })
        .then(context => {
          this.websocketServer.emit('connection', connection, request, context)
        })
        .catch(() => {
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
  handleConnection(incoming: WebSocket, request: IncomingMessage, context: any = null): void {
    console.log(`New connection to ${request.url}`)

    const document = this.createDocument(request)
    const connection = this.createConnection(incoming, request, document, context)

    const data = {
      clientsCount: document.connectionsCount(),
      context,
      document,
      documentName: document.name,
      requestHeaders: request.headers,
      requestParameters: this.getParameters(request),
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
   * Handle update of the given document
   * @param document
   * @param update
   * @param request
   * @returns {*}
   */
  handleDocumentUpdate(document: Document, update: any, request: IncomingMessage): void {
    if (this.configuration.persistence) {
      this.configuration.persistence.store(document.name, update)
      console.log(`Document ${document.name} saved`)
    }

    const data = {
      clientsCount: document.connectionsCount(),
      document,
      documentName: document.name,
      requestHeaders: request.headers,
      requestParameters: this.getParameters(request),
    }

    if (!this.configuration.debounce) {
      this.configuration.onChange(data)
      return
    }

    if (!this.debounceStart) {
      this.debounceStart = this.now()
    }

    if (this.now() - this.debounceStart >= this.configuration.debounceMaxWait) {
      this.configuration.onChange(data)
      this.debounceStart = null
      return
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.debounceTimeout = setTimeout(
      () => this.configuration.onChange(data),
      this.debounceDuration,
    )
  }

  /**
   * Create a new document by the given request
   * @param request
   * @private
   */
  createDocument(request: IncomingMessage): Document {
    const documentName = request.url?.slice(1)?.split('?')[0] || ''

    return map.setIfUndefined(this.documents, documentName, () => {
      const document = new Document(documentName)

      document.onUpdate(
        (document: any, update: any) => this.handleDocumentUpdate(document, update, request),
      )

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
  createConnection(connection: WebSocket, request: IncomingMessage, document: Document, context = null): Connection {
    return new Connection(
      connection,
      request,
      document,
      this.configuration.timeout,
      context,
    )
      .onClose((document: any) => {

        this.configuration.onDisconnect({
          document,
          documentName: document.name,
          requestHeaders: request.headers,
          clientsCount: document.connectionsCount(),
        })

        if (document.connectionsCount() > 0) {
          return
        }

        this.documents.delete(document.name)
      })
  }

  /**
   * Get the current process time in milliseconds
   * @returns {number}
   */
  now(): number {
    const hrTime = process.hrtime()
    return Math.round(hrTime[0] * 1000 + hrTime[1] / 1000000)
  }

  /**
   * Get parameters by the given request
   * @param request
   * @returns {{}|URLSearchParams}
   */
  getParameters(request: IncomingMessage): {} {
    const query = request?.url?.split('?') || []

    if (!query[1]) {
      return {}
    }

    return new URLSearchParams(query[1])
  }

  /**
   * Get debounce duration
   * @returns {number}
   */
  get debounceDuration(): number {
    return Number.isNaN(this.configuration.debounce)
      ? 2000
      : this.configuration.debounce
  }
}

export const Server = new Hocuspocus()
