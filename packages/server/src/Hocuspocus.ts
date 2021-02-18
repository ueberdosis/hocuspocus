import WebSocket from 'ws'
import { createServer, IncomingMessage, Server as HTTPServer } from 'http'
import { Doc, encodeStateAsUpdate, applyUpdate } from 'yjs'
import { URLSearchParams } from 'url'
import { Configuration } from './types'
import Document from './Document'
import Connection from './Connection'

/**
 * Hocuspocus y-js websocket server
 */
class Hocuspocus {

  configuration: Configuration = {
    onCreateDocument: (data, resolve) => resolve(),
    onChange: () => null,
    onConnect: (data, resolve) => resolve(),
    onDisconnect: () => null,
    onListen: (data, resolve) => resolve(),
    onUpgrade: (data, resolve) => resolve(),
    extensions: [],
    port: 80,
    timeout: 30000,
  }

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
      onConnect, onChange, onDisconnect, onCreateDocument, onListen, onUpgrade,
    } = this.configuration

    this.configuration.extensions.push({
      onConnect, onChange, onDisconnect, onCreateDocument, onListen, onUpgrade,
    })

    return this

  }

  /**
   * Start the server
   */
  listen(): void {

    const server = createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('OK')
    })

    const websocketServer = new WebSocket.Server({ noServer: true })
    websocketServer.on('connection', this.handleConnection.bind(this))

    server.on('upgrade', (request, socket, head) => {

      this.runAllHooks('onUpgrade', {})
        .then(() => websocketServer.handleUpgrade(request, socket, head, ws => {
          websocketServer.emit('connection', ws, request)
        }))
        .catch(() => {
          console.log('upgrade')
        })

    })

    this.runAllHooks('onListen', {
      server,
      websocketServer,
      port: this.configuration.port,
    })
      .then(() => server.listen(this.configuration.port))

    this.httpServer = server
    this.websocketServer = websocketServer

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

    this.runAllHooks('onConnect', hookPayload).catch(() => connection.close())

  }

  /**
   * Handle update of the given document
   * @private
   */
  private handleDocumentUpdate(document: Document, update: Uint8Array, request: IncomingMessage): void {

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
   * Run the given hook on all configured extensions
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
   * Get parameters by the given request
   * @private
   */
  private static getParameters(request: IncomingMessage): URLSearchParams {

    const query = request?.url?.split('?') || []
    return new URLSearchParams(query[1] ? query[1] : '')

  }
}

export const Server = new Hocuspocus()
