import WebSocket from 'ws'
import { createServer, IncomingMessage, Server as HTTPServer } from 'http'
import { Doc, encodeStateAsUpdate, applyUpdate } from 'yjs'
import { URLSearchParams } from 'url'
import { v4 as uuid } from 'uuid'

import { Configuration } from './types'
import Document from './Document'
import Connection from './Connection'
import packageJson from '../package.json'

export const defaultConfiguration = {
  port: 80,
  timeout: 30000,
}

/**
 * Hocuspocus yjs websocket server
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

  websocketServer?: WebSocket.Server

  incomingMessageQueue: Iterable<number>[] = []

  /**
   * Configure the server
   */
  configure(configuration: Partial<Configuration>): Hocuspocus {

    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.configuration.extensions.push({
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
    })

    return this

  }

  /**
   * Start the server
   */
  async listen(): Promise<void> {

    const websocketServer = new WebSocket.Server({ noServer: true })
    websocketServer.on('connection', (incoming: WebSocket, request: IncomingMessage) => {
      this.handleConnection(incoming, request, Hocuspocus.getDocumentName(request))
    })

    const server = createServer((request, response) => {
      this.hooks('onRequest', { request, response })
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
      this.hooks('onUpgrade', { request, socket, head })
        .then(() => {
          // let the default websocket server handle the connection if
          // prior hooks don't interfere
          websocketServer.handleUpgrade(request, socket, head, ws => {
            websocketServer.emit('connection', ws, request)
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
    this.websocketServer = websocketServer

    await new Promise((resolve: Function, reject: Function) => {
      server.listen(this.configuration.port, () => {
        this.hooks('onListen', { port: this.configuration.port })
          .then(() => resolve())
          .catch(e => reject(e))
      })
    })

  }

  /**
   * Destroy the server
   */
  async destroy(): Promise<any> {

    this.httpServer?.close()
    this.websocketServer?.close()

    await this.hooks('onDestroy', {})

  }

  /**
   * Handle the incoming websocket connection
   */
  handleConnection(incoming: WebSocket, request: IncomingMessage, documentName: string, context: any = null): void {

    // create a unique identifier for every socket connection
    const socketId = uuid()
    const connection = { readOnly: false }

    const hookPayload = {
      documentName,
      request,
      requestHeaders: request.headers,
      requestParameters: Hocuspocus.getParameters(request),
      socketId,
      connection,
    }

    // Queue messages before the connection is established
    const queueIncomingMessageListener = this.queueIncomingMessage.bind(this)
    incoming.on('message', queueIncomingMessageListener)

    this.hooks('onConnect', hookPayload, (contextAdditions: any) => {
      // merge context from all hooks
      context = { ...context, ...contextAdditions }
    })
      .then(() => {
        // if no hook interrupts create a document and connection
        const document = this.createDocument(documentName, request, socketId, context)
        this.createConnection(incoming, request, document, socketId, connection.readOnly, context)

        // Remove the queue listener
        incoming.off('message', queueIncomingMessageListener)
        // Work through queue messages
        this.incomingMessageQueue.forEach(input => {
          incoming.emit('message', input)
        })
      })
      .catch(e => {
        // if a hook interrupts, close the websocket connection
        incoming.close()
        if (e) throw e
      })

  }

  /**
   * Queue incoming WebSocket messages before the onConnect hooks are finished
   * and the connection is full established
   * @private
   */
  private queueIncomingMessage(input: Iterable<number>): void {
    this.incomingMessageQueue.push(input)
  }

  /**
   * Handle update of the given document
   * @private
   */
  private handleDocumentUpdate(document: Document, connection: Connection, update: Uint8Array, request: IncomingMessage, socketId: string): void {

    const hookPayload = {
      clientsCount: document.connectionsCount(),
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
  private createDocument(documentName: string, request: IncomingMessage, socketId: string, context?: any): Document {

    if (this.documents.has(documentName)) {
      return this.documents.get(documentName)
    }

    const document = new Document(documentName)

    document.onUpdate((document, connection, update) => {
      this.handleDocumentUpdate(document, connection, update, request, connection?.socketId)
    })

    const hookPayload = {
      context,
      document,
      documentName,
      socketId,
      requestHeaders: request.headers,
      requestParameters: Hocuspocus.getParameters(request),
    }

    this.hooks('onCreateDocument', hookPayload, (loadedDocument: Doc | undefined) => {
      // if a hook returns a Y-Doc, encode the document state as update
      // and apply it to the newly created document
      // Note: instanceof doesn't work, because Doc !== Doc for some reason I don't understand
      if (
        loadedDocument?.constructor.name === 'Document'
        || loadedDocument?.constructor.name === 'Doc'
      ) {
        applyUpdate(document, encodeStateAsUpdate(loadedDocument))
      }
    }).catch(e => {
      throw e
    })

    this.documents.set(documentName, document)

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
        clientsCount: document.connectionsCount(),
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
          if (document.connectionsCount() <= 0) {
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
      if (callback) chain = chain.then((...args: any[]) => callback(...args))
    }

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
    return request.url?.slice(1)?.split('?')[0] || ''
  }
}

export const Server = new Hocuspocus()
