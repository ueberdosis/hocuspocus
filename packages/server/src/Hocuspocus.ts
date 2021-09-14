import * as decoding from 'lib0/decoding'
import WebSocket from 'ws'
import { createServer, IncomingMessage, Server as HTTPServer } from 'http'
import { Doc, encodeStateAsUpdate, applyUpdate } from 'yjs'
import { URLSearchParams } from 'url'
import { v4 as uuid } from 'uuid'
import { MessageType, Configuration, ConnectionConfig } from './types'
import Document from './Document'
import Connection from './Connection'
import { Forbidden, ResetConnection } from './CloseEvents'
import { OutgoingMessage } from './OutgoingMessage'
import packageJson from '../package.json'
import { Debugger, MessageLogger } from './Debugger'

export const defaultConfiguration = {
  port: 80,
  timeout: 30000,
}

/**
 * Hocuspocus server
 */
export class Hocuspocus {
  configuration: Configuration = {
    ...defaultConfiguration,
    extensions: [],
    onChange: () => new Promise(r => r(null)),
    onConfigure: () => new Promise(r => r(null)),
    onConnect: () => new Promise(r => r(null)),
    onCreateDocument: () => new Promise(r => r(null)),
    onDestroy: () => new Promise(r => r(null)),
    onDisconnect: () => new Promise(r => r(null)),
    onListen: () => new Promise(r => r(null)),
    onRequest: () => new Promise(r => r(null)),
    onUpgrade: () => new Promise(r => r(null)),
  }

  documents = new Map()

  httpServer?: HTTPServer

  webSocketServer?: WebSocket.Server

  debugger: MessageLogger = Debugger

  /**
   * Configure the server
   */
  configure(configuration: Partial<Configuration>): Hocuspocus {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.configuration.extensions.push({
      onAuthenticate: this.configuration.onAuthenticate,
      onChange: this.configuration.onChange,
      onConfigure: this.configuration.onConfigure,
      onConnect: this.configuration.onConnect,
      onCreateDocument: this.configuration.onCreateDocument,
      onDestroy: this.configuration.onDestroy,
      onDisconnect: this.configuration.onDisconnect,
      onListen: this.configuration.onListen,
      onRequest: this.configuration.onRequest,
      onUpgrade: this.configuration.onUpgrade,
    })

    this.hooks('onConfigure', {
      configuration: this.configuration,
      version: packageJson.version,
      yjsVersion: null,
      instance: this,
    })

    return this
  }

  get authenticationRequired(): boolean {
    return !!this.configuration.extensions.find(extension => {
      return extension.onAuthenticate !== undefined
    })
  }

  /**
   * Start the server
   */
  async listen(): Promise<void> {
    const webSocketServer = new WebSocket.Server({ noServer: true })
    webSocketServer.on('connection', (incoming: WebSocket, request: IncomingMessage) => {
      this.handleConnection(incoming, request, Hocuspocus.getDocumentName(request))
    })

    const server = createServer((request, response) => {
      this.hooks('onRequest', { request, response, instance: this })
        .then(() => {
          // default response if all prior hooks don't interfere
          response.writeHead(200, { 'Content-Type': 'text/plain' })
          response.end('OK')
        })
        .catch(e => {
          // if a hook rejects and the error is empty, do nothing
          // this is only meant to prevent later hooks and the
          // default handler to do something. if a error is present
          // just rethrow it
          if (e) throw e
        })
    })

    server.on('upgrade', (request, socket, head) => {
      this.hooks('onUpgrade', {
        request, socket, head, instance: this,
      })
        .then(() => {
          // let the default websocket server handle the connection if
          // prior hooks don't interfere
          // TODO: Argument of type 'Duplex' is not assignable to parameter of type 'Socket'.
          // @ts-ignore
          webSocketServer.handleUpgrade(request, socket, head, ws => {
            webSocketServer.emit('connection', ws, request)
          })
        })
        .catch(e => {
          // if a hook rejects and the error is empty, do nothing
          // this is only meant to prevent later hooks and the
          // default handler to do something. if a error is present
          // just rethrow it
          if (e) throw e
        })
    })

    this.httpServer = server
    this.webSocketServer = webSocketServer

    await new Promise((resolve: Function, reject: Function) => {
      server.listen(this.configuration.port, () => {
        this.hooks('onListen', { port: this.configuration.port })
          .then(() => resolve())
          .catch(e => reject(e))
      })
    })
  }

  /**
   * Get the total number of active documents
   */
  getDocumentsCount(): number {
    return this.documents.size
  }

  /**
   * Get the total number of active connections
   */
  getConnectionsCount(): number {
    return Array.from(this.documents.values()).reduce((acc, document) => {
      acc += document.getConnectionsCount()
      return acc
    }, 0)
  }

  /**
   * Force close one or more connections
   */
  closeConnections(documentName?: string) {
    // Iterate through all connections for all documents
    // and invoke their close method, which is a graceful
    // disconnect wrapper around the underlying websocket.close
    this.documents.forEach((document: Document) => {
      // If a documentName was specified, bail if it doesnt match
      if (documentName && document.name !== documentName) {
        return
      }

      document.connections.forEach(({ connection } = { connection: Connection }) => {
        connection.close(ResetConnection)
      })
    })
  }

  /**
   * Destroy the server
   */
  async destroy(): Promise<any> {
    this.httpServer?.close()
    this.webSocketServer?.close()

    await this.hooks('onDestroy', { instance: this })
  }

  /**
   * Handle the incoming WebSocket connection
   */
  handleConnection(incoming: WebSocket, request: IncomingMessage, documentName: string, context: any = null): void {
    // create a unique identifier for every socket connection
    const socketId = uuid()
    const connection: ConnectionConfig = { readOnly: false, isAuthenticated: false }

    const hookPayload = {
      documentName,
      instance: this,
      request,
      requestHeaders: request.headers,
      requestParameters: Hocuspocus.getParameters(request),
      socketId,
      connection,
    }

    const incomingMessageQueue: Uint8Array[] = []

    const handleNewConnection = (listener: (input: Uint8Array) => void) => async () => {
      if (this.authenticationRequired && !connection.isAuthenticated) {
        return
      }

      // If no hook interrupts, create a document and connection
      this.createDocument(documentName, request, socketId, connection, context).then(document => {
        this.createConnection(incoming, request, document, socketId, connection.readOnly, context)

        // Remove the queue listener
        incoming.off('message', listener)
        // Work through queued messages
        incomingMessageQueue.forEach(input => {
          incoming.emit('message', input)
        })
      })
    }

    // Messages are queued using this handler before the connection is
    // authenticated and the document is loaded from persistence.
    const queueIncomingMessageListener = (data: Uint8Array) => {
      const decoder = decoding.createDecoder(data)
      const type = decoding.readVarUint(decoder)

      if (type === MessageType.Auth) {
        // The 2nd integer contains the submessage type
        // which will always be authentication when sent from client -> server
        decoding.readVarUint(decoder)
        const token = decoding.readVarString(decoder)

        this.debugger.log({
          direction: 'in',
          type,
          category: 'Token',
        })

        this.hooks('onAuthenticate', { token, ...hookPayload }, (contextAdditions: any) => {
          // Merge the context from the hook
          context = { ...context, ...contextAdditions }
        })
          .then(() => {
            connection.isAuthenticated = true

            const message = new OutgoingMessage().writeAuthenticated()

            this.debugger.log({
              direction: 'out',
              type: message.type,
              category: message.category,
            })

            incoming.send(message.toUint8Array())
          })
          .then(handleNewConnection(queueIncomingMessageListener))
          .catch(error => {
            // We could pass the Error message through to the client here but it
            // risks exposing server internals or being a very long stack trace
            // hardcoded to 'permission-denied' for now
            const message = new OutgoingMessage().writePermissionDenied('permission-denied')

            this.debugger.log({
              direction: 'out',
              type: message.type,
              category: message.category,
            })

            // Ensure that the permission denied message is sent before the
            // connection is closed
            incoming.send(message.toUint8Array(), () => {
              incoming.close(Forbidden.code, Forbidden.reason)
            })
          })
      } else {
        incomingMessageQueue.push(data)
      }
    }

    incoming.on('message', queueIncomingMessageListener)

    this.hooks('onConnect', hookPayload, (contextAdditions: any) => {
      // merge context from all hooks
      context = { ...context, ...contextAdditions }
    })
      .then(handleNewConnection(queueIncomingMessageListener))
      .catch(error => {
        // if a hook interrupts, close the websocket connection
        incoming.close(Forbidden.code, Forbidden.reason)

        if (error) {
          throw error
        }
      })
  }

  /**
   * Handle update of the given document
   * @private
   */
  private handleDocumentUpdate(document: Document, connection: Connection, update: Uint8Array, request: IncomingMessage, socketId: string): void {
    const hookPayload = {
      instance: this,
      clientsCount: document.getConnectionsCount(),
      context: connection?.context || {},
      document,
      documentName: document.name,
      requestHeaders: request.headers,
      requestParameters: Hocuspocus.getParameters(request),
      socketId,
      update,
    }

    this.hooks('onChange', hookPayload).catch(e => {
      throw e
    })
  }

  /**
   * Create a new document by the given request
   * @private
   */
  private async createDocument(documentName: string, request: IncomingMessage, socketId: string, connection: ConnectionConfig, context?: any): Promise<Document> {
    if (this.documents.has(documentName)) {
      const document = this.documents.get(documentName)
      return document
    }

    const document = new Document(documentName)
    this.documents.set(documentName, document)

    const hookPayload = {
      instance: this,
      context,
      connection,
      document,
      documentName,
      socketId,
      requestHeaders: request.headers,
      requestParameters: Hocuspocus.getParameters(request),
    }

    await this.hooks('onCreateDocument', hookPayload, (loadedDocument: Doc | undefined) => {
      // if a hook returns a Y-Doc, encode the document state as update
      // and apply it to the newly created document
      // Note: instanceof doesn't work, because Doc !== Doc for some reason I don't understand
      if (
        loadedDocument?.constructor.name === 'Document'
        || loadedDocument?.constructor.name === 'Doc'
      ) {
        applyUpdate(document, encodeStateAsUpdate(loadedDocument))
      }
    })

    document.onUpdate((document: Document, connection: Connection, update: Uint8Array) => {
      this.handleDocumentUpdate(document, connection, update, request, connection?.socketId)
    })

    return document
  }

  /**
   * Create a new connection by the given request and document
   * @private
   */
  private createConnection(connection: WebSocket, request: IncomingMessage, document: Document, socketId: string, readOnly = false, context?: any): Connection {
    const instance = new Connection(connection, request, document, this.configuration.timeout, socketId, context, readOnly)

    instance.onClose(document => {
      const hookPayload = {
        instance: this,
        clientsCount: document.getConnectionsCount(),
        context,
        document,
        socketId,
        documentName: document.name,
        requestHeaders: request.headers,
        requestParameters: Hocuspocus.getParameters(request),
      }

      this.hooks('onDisconnect', hookPayload)
        .catch(e => {
          throw e
        })
        .finally(() => {
          if (document.getConnectionsCount() <= 0) {
            this.documents.delete(document.name)
          }
        })
    })

    return instance
  }

  /**
   * Run the given hook on all configured extensions
   * Runs the given callback after each hook
   * @private
   */
  private hooks(name: string, hookPayload: any, callback: Function | null = null): Promise<any> {
    const { extensions } = this.configuration

    let chain = Promise.resolve()

    for (let i = 0; i < extensions.length; i += 1) {
      // @ts-ignore
      chain = chain.then(() => (extensions[i][name] ? extensions[i][name](hookPayload) : null))

      if (callback) {
        chain = chain.then((...args: any[]) => callback(...args))
      }
    }

    chain.catch(error => {
      if (error?.message) {
        // TODO: Move to Logger extension?
        console.log(`[${name}]`, error.message)
      }
    })

    return chain
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
   * Get document name by the given request
   * @private
   */
  private static getDocumentName(request: IncomingMessage): string {
    return decodeURI(
      request.url?.slice(1)?.split('?')[0] || '',
    )
  }

  enableDebugging() {
    this.debugger.enable()
  }

  enableMessageLogging() {
    this.debugger.enable()
    this.debugger.verbose()
  }

  disableLogging() {
    this.debugger.quiet()
  }

  disableDebugging() {
    this.debugger.disable()
  }

  flushMessageLogs() {
    this.debugger.flush()

    return this
  }

  getMessageLogs() {
    return this.debugger.get()?.logs
  }
}

export const Server = new Hocuspocus()
