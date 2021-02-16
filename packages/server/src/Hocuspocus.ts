import WebSocket from 'ws'
import { createServer, IncomingMessage, Server as HTTPServer } from 'http'
import { URLSearchParams } from 'url'
import { Doc, encodeStateAsUpdate, applyUpdate } from 'yjs'
import { Configuration } from './types'
import Document from './Document'
import Connection from './Connection'

/**
 * Hocuspocus y-js websocket server
 */
class Hocuspocus {

  configuration: Configuration = {
    debounce: 1000,
    debounceMaxWait: 10000,
    onCreateDocument: (data, resolve) => resolve(),
    onChange: () => null,
    onConnect: (data, resolve) => resolve(),
    onDisconnect: () => null,
    extensions: [],
    port: 80,
    timeout: 30000,
  }

  debounceStart: Map<string, number|null> = new Map()

  debounceTimeout: Map<string, NodeJS.Timeout> = new Map()

  documents = new Map()

  httpServer?: HTTPServer

  websocketServer?: WebSocket.Server

  /**
   * Configure the server
   */
  configure(configuration: Partial<Configuration>): Hocuspocus {

    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    const {
      onConnect,
      onChange,
      onDisconnect,
      onCreateDocument,
    } = this.configuration

    this.configuration.extensions.push({
      onConnect, onChange, onDisconnect, onCreateDocument,
    })

    return this

  }

  /**
   * Start the server
   */
  listen(): void {

    this.httpServer = createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('OK')
    })

    this.websocketServer = new WebSocket.Server({ server: this.httpServer })
    this.websocketServer.on('connection', this.handleConnection.bind(this))

    this.httpServer.listen(this.configuration.port, () => {
      console.log(`Listening on http://127.0.0.1:${this.configuration.port}`)
    })

  }

  /**
   * Handle the incoming websocket connection
   */
  handleConnection(incoming: WebSocket, request: IncomingMessage, context: any = null): void {

    const document = this.createDocument(request)
    const connection = this.createConnection(incoming, request, document, context)

    const hookPayload = {
      clientsCount: document.connectionsCount(),
      context,
      document,
      documentName: document.name,
      requestHeaders: request.headers,
      requestParameters: Hocuspocus.getParameters(request),
    }

    this.runAllHooks('onConnect', hookPayload)
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
   * @private
   */
  private handleDocumentUpdate(document: Document, update: Uint8Array, request: IncomingMessage): void {

    if (!this.configuration.debounce) {
      return this.saveDocument(document, update, request)
    }

    const { name } = document

    if (!this.debounceStart.get(name)) {
      this.debounceStart.set(name, Hocuspocus.now())
    }

    // @ts-ignore
    if (Hocuspocus.now() - this.debounceStart.get(name) >= this.configuration.debounceMaxWait) {
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
   * Save the given document using the configured extensions
   * @private
   */
  private saveDocument(document: Document, update: Uint8Array, request:IncomingMessage): void {

    this.configuration.extensions.forEach(extension => extension.onChange({
      clientsCount: document.connectionsCount(),
      document,
      documentName: document.name,
      requestHeaders: request.headers,
      requestParameters: Hocuspocus.getParameters(request),
      update,
    }))

  }

  /**
   * Create a new document by the given request
   */
  private createDocument(request: IncomingMessage): Document {

    const documentName = request.url?.slice(1)?.split('?')[0] || ''

    if (this.documents.has(documentName)) {
      return this.documents.get(documentName)
    }

    const document = new Document(documentName)

    document.onUpdate((document, update) => {
      this.handleDocumentUpdate(document, update, request)
    })

    this.runAllHooks(
      'onCreateDocument',
      { document, documentName },
      (loadedDocument: Doc | undefined) => {
        if (loadedDocument instanceof Doc) {
          applyUpdate(document, encodeStateAsUpdate(loadedDocument))
        }
      },
    )

    this.documents.set(documentName, document)

    return document
  }

  /**
   * Create a new connection by the given request and document
   * @private
   */
  private createConnection(connection: WebSocket, request: IncomingMessage, document: Document, context = null): Connection {

    return new Connection(connection, request, document, this.configuration.timeout, context)
      .onClose(document => {

        this.configuration.extensions.forEach(extension => extension.onDisconnect({
          clientsCount: document.connectionsCount(),
          context,
          document,
          documentName: document.name,
          requestHeaders: request.headers,
          requestParameters: Hocuspocus.getParameters(request),
        }))

        if (document.connectionsCount() > 0) {
          return
        }

        this.documents.delete(document.name)
      })

  }

  /**
   * Run all the given hook on all configured extensions
   * @private
   */
  private runAllHooks(name: string, hookPayload: any, callback: Function | null = null): Promise<any> {
    const chain = this.runHook(name, 0, hookPayload, callback)

    for (let i = 1; i < this.configuration.extensions.length; i += 1) {
      chain.then(() => this.runHook(name, i, hookPayload, callback))
    }

    return chain

  }

  /**
   * Run a hook that reacts to a promise by the given name on the
   * extension with the given index
   * @private
   */
  private runHook(name: string, extensionIndex: number, hookPayload: any, callback: Function | null = null): Promise<any> {

    return new Promise((resolve, reject) => {
      // @ts-ignore
      this.configuration.extensions[extensionIndex][name](hookPayload, resolve, reject)
    }).then((...args) => {
      if (callback) callback(...args)
      return new Promise<void>(resolve => resolve())
    })

  }

  /**
   * Get the current process time in milliseconds
   * @private
   */
  private static now(): number {

    const hrTime = process.hrtime()
    return Math.round(hrTime[0] * 1000 + hrTime[1] / 1000000)

  }

  /**
   * Get parameters by the given request
   * @private
   */
  private static getParameters(request: IncomingMessage): URLSearchParams {

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
