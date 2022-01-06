import * as decoding from 'lib0/decoding'
import WebSocket, { WebSocketServer } from 'ws'
import { createServer, IncomingMessage, Server as HTTPServer } from 'http'
import { Doc, encodeStateAsUpdate, applyUpdate } from 'yjs'
import { URLSearchParams } from 'url'
import { v4 as uuid } from 'uuid'
import kleur from 'kleur'
import { ResetConnection, Unauthorized, Forbidden } from '@hocuspocus/common'
import {
  MessageType,
  Configuration,
  ConnectionConfiguration,
  WsReadyStates,
  Hook,
} from './types'
import Document from './Document'
import Connection from './Connection'
import { OutgoingMessage } from './OutgoingMessage'
import meta from '../package.json'
import { Debugger, MessageLogger } from './Debugger'
import { onListenPayload } from '.'

export const defaultConfiguration = {
  name: null,
  port: 80,
  timeout: 30000,
  quiet: false,
}

const defaultOnCreateDocument = () => new Promise(r => r(null))

/**
 * Hocuspocus Server
 */
export class Hocuspocus {
  configuration: Configuration = {
    ...defaultConfiguration,
    extensions: [],
    onChange: () => new Promise(r => r(null)),
    onConfigure: () => new Promise(r => r(null)),
    onConnect: () => new Promise(r => r(null)),
    onCreateDocument: defaultOnCreateDocument,
    onLoadDocument: () => new Promise(r => r(null)),
    onStoreDocument: () => new Promise(r => r(null)),
    onDestroy: () => new Promise(r => r(null)),
    onDisconnect: () => new Promise(r => r(null)),
    onListen: () => new Promise(r => r(null)),
    onRequest: () => new Promise(r => r(null)),
    onUpgrade: () => new Promise(r => r(null)),
  }

  documents = new Map()

  httpServer?: HTTPServer

  webSocketServer?: WebSocketServer

  debugger: MessageLogger = Debugger

  /**
   * Configure the server
   */
  configure(configuration: Partial<Configuration>): Hocuspocus {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    /**
     * The `onCreateDocument` hook has been renamed to `onLoadDocument`.
     * We’ll keep this workaround to support the deprecated hook for a while, but output a warning.
     */
    let onLoadDocument
    if (this.configuration.onCreateDocument !== defaultOnCreateDocument) {
      console.warn('[hocuspocus warn]: The onCreateDocument hook has been renamed. Use the onLoadDocument hook instead.')
      onLoadDocument = this.configuration.onCreateDocument
    } else {
      onLoadDocument = this.configuration.onLoadDocument
    }

    this.configuration.extensions.push({
      onAuthenticate: this.configuration.onAuthenticate,
      onChange: this.configuration.onChange,
      onConfigure: this.configuration.onConfigure,
      onConnect: this.configuration.onConnect,
      onLoadDocument,
      onStoreDocument: this.configuration.onStoreDocument,
      onDestroy: this.configuration.onDestroy,
      onDisconnect: this.configuration.onDisconnect,
      onListen: this.configuration.onListen,
      onRequest: this.configuration.onRequest,
      onUpgrade: this.configuration.onUpgrade,
    })

    this.hooks('onConfigure', {
      configuration: this.configuration,
      version: meta.version,
      yjsVersion: null,
      instance: this,
    })

    return this
  }

  get requiresAuthentication(): boolean {
    return !!this.configuration.extensions.find(extension => {
      return extension.onAuthenticate !== undefined
    })
  }

  /**
   * Start the server
   */
  async listen(
    portOrCallback: number | ((data: onListenPayload) => Promise<any>) | null = null,
    callback: any = null,
  ): Promise<void> {
    if (typeof portOrCallback === 'number') {
      this.configuration.port = portOrCallback
    }

    if (typeof portOrCallback === 'function') {
      this.configuration.extensions.push({
        onListen: portOrCallback,
      })
    }

    if (typeof callback === 'function') {
      this.configuration.extensions.push({
        onListen: callback,
      })
    }

    const webSocketServer = new WebSocketServer({ noServer: true })

    webSocketServer.on('connection', async (incoming: WebSocket, request: IncomingMessage) => {
      this.handleConnection(incoming, request, await this.getDocumentNameFromRequest(request))
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
        if (!this.configuration.quiet && process.env.NODE_ENV !== 'testing') {
          this.showStartScreen()
        }

        this.hooks('onListen', { port: this.configuration.port })
          .then(() => resolve())
          .catch(e => reject(e))
      })
    })
  }

  private showStartScreen() {
    const name = this.configuration.name ? ` (${this.configuration.name})` : ''

    console.log()
    console.log(`  ${kleur.cyan(`Hocuspocus v${meta.version}${name}`)}${kleur.green(' running at:')}`)
    console.log()
    console.log(`  > HTTP: ${kleur.cyan(`http://127.0.0.1:${this.configuration.port}`)}`)
    console.log(`  > WebSocket: ws://127.0.0.1:${this.configuration.port}`)

    const extensions = this.configuration?.extensions.map(extension => {
      return extension.constructor?.name
    })
      .filter(name => name)
      .filter(name => name !== 'Object')

    if (!extensions.length) {
      return
    }

    console.log()
    console.log('  Extensions:')

    extensions
      .forEach(name => {
        console.log(`  - ${name}`)
      })

    console.log()
    console.log(`  ${kleur.green('Ready.')}`)
    console.log()
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

    try {
      this.webSocketServer?.close()
      this.webSocketServer?.clients.forEach(client => {
        client.terminate()
      })
    } catch (e) {
      //
    }

    this.debugger.flush()

    await this.hooks('onDestroy', { instance: this })
  }

  /**
   * The `handleConnection` method receives incoming WebSocket connections,
   * runs all hooks:
   *
   *  - onConnect for all connections
   *  - onAuthenticate only if required
   *
   * … and if nothings fails it’ll fully establish the connection and
   * load the Document then.
   */
  handleConnection(incoming: WebSocket, request: IncomingMessage, documentName: string, context: any = null): void {
    // Make sure to close an idle connection after a while.
    const closeIdleConnection = setTimeout(() => {
      incoming.close(Unauthorized.code, Unauthorized.reason)
    }, this.configuration.timeout)

    // Every new connection gets an unique identifier.
    const socketId = uuid()

    // To override settings for specific connections, we’ll
    // keep track of a few things in the `ConnectionConfiguration`.
    const connection: ConnectionConfiguration = {
      readOnly: false,
      requiresAuthentication: this.requiresAuthentication,
      isAuthenticated: false,
    }

    // The `onConnect` and `onAuthenticate` hooks need some context
    // to decide who’s connecting, so let’s put it together:
    const hookPayload = {
      documentName,
      instance: this,
      request,
      requestHeaders: request.headers,
      requestParameters: Hocuspocus.getParameters(request),
      socketId,
      connection,
    }

    // While the connection will be establishing messages will
    // be queued and handled later.
    const incomingMessageQueue: Uint8Array[] = []

    // Once all hooks are run, we’ll fully establish the connection:
    const setUpNewConnection = async (listener: (input: Uint8Array) => void) => {
      // Not an idle connection anymore, no need to close it then.
      clearTimeout(closeIdleConnection)

      // If no hook interrupts, create a document and connection
      const document = await this.createDocument(documentName, request, socketId, connection, context)
      this.createConnection(incoming, request, document, socketId, connection.readOnly, context)

      // There’s no need to queue messages anymore.
      incoming.off('message', listener)
      // Let’s work through queued messages.
      incomingMessageQueue.forEach(input => {
        incoming.emit('message', input)
      })
    }

    // This listener handles authentication messages and queues everything else.
    const queueIncomingMessageListener = (data: Uint8Array) => {
      const decoder = decoding.createDecoder(data)
      const type = decoding.readVarUint(decoder)

      // Okay, we’ve got the authentication message we’re waiting for:
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
          // Hooks are allowed to give us even more context and we’ll merge everything together.
          // We’ll pass the context to other hooks then.
          context = { ...context, ...contextAdditions }
        })
          .then(() => {
            // All `onAuthenticate` hooks passed.
            connection.isAuthenticated = true

            // Let the client know that authentication was successful.
            const message = new OutgoingMessage().writeAuthenticated()

            this.debugger.log({
              direction: 'out',
              type: message.type,
              category: message.category,
            })

            incoming.send(message.toUint8Array())
          })
          .then(() => {
            // Time to actually establish the connection.
            setUpNewConnection(queueIncomingMessageListener)
          })
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
              incoming.off('message', queueIncomingMessageListener)
            })
          })
      } else {
        // It’s not the Auth message we’re waiting for, so just queue it.
        incomingMessageQueue.push(data)
      }
    }

    incoming.on('message', queueIncomingMessageListener)

    this.hooks('onConnect', hookPayload, (contextAdditions: any) => {
      // merge context from all hooks
      context = { ...context, ...contextAdditions }
    })
      .then(() => {
        // Authentication is required, we’ll need to wait for the Authentication message.
        if (connection.requiresAuthentication && !connection.isAuthenticated) {
          return
        }

        // Authentication isn’t required, let’s establish the connection
        setUpNewConnection(queueIncomingMessageListener)
      })
      .catch(() => {
        // if a hook interrupts, close the websocket connection
        incoming.close(Forbidden.code, Forbidden.reason)
        incoming.off('message', queueIncomingMessageListener)
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

    this.hooks('onStoreDocument', hookPayload).catch(e => {
      throw e
    })
  }

  /**
   * Create a new document by the given request
   * @private
   */
  private async createDocument(documentName: string, request: IncomingMessage, socketId: string, connection: ConnectionConfiguration, context?: any): Promise<Document> {
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

    await this.hooks('onLoadDocument', hookPayload, (loadedDocument: Doc | undefined) => {
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

    await this.hooks('onLoadedDocument', hookPayload)

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

      // Remove the document from the map immediately before the hooks are called
      // as these may take some time to resolve (eg persist to database). If a
      // new connection were to come in during that time it would rely on the
      // document in the map that we later remove.
      if (document.getConnectionsCount() <= 0) {
        this.hooks('onStoreDocument', hookPayload)

        this.documents.delete(document.name)
      }

      this.hooks('onDisconnect', hookPayload)
        .catch(e => {
          throw e
        })
        .finally(() => {
          if (document.getConnectionsCount() <= 0) {
            document.destroy()
          }
        })
    })

    // If the websocket has already disconnected (wow, that was fast) – then
    // immediately call close to cleanup the connection and doc in memory.
    if (
      connection.readyState === WsReadyStates.Closing
      || connection.readyState === WsReadyStates.Closed
    ) {
      instance.close()
    }

    return instance
  }

  /**
   * Run the given hook on all configured extensions
   * Runs the given callback after each hook
   */
  hooks(name: Hook, payload: any, callback: Function | null = null): Promise<any> {
    const { extensions } = this.configuration

    // create a new `thenable` chain
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve
    let chain = Promise.resolve()

    extensions
      // get me all extensions which have the given hook
      .filter(extension => typeof extension[name] === 'function')
      // run through all the configured hooks
      .forEach(extension => {
        chain = chain
          .then(() => extension[name]?.(payload))
          .catch(error => {
            // make sure to log error messages
            if (error && error.message) {
              console.error(`[${name}]`, error.message)
            }

            throw error
          })

        if (callback) {
          chain = chain.then((...args: any[]) => callback(...args))
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
  private async getDocumentNameFromRequest(request: IncomingMessage): Promise<string> {
    const documentName = decodeURI(
      request.url?.slice(1)?.split('?')[0] || '',
    )

    if (!this.configuration.getDocumentName) {
      return documentName
    }

    const requestParameters = Hocuspocus.getParameters(request)

    return this.configuration.getDocumentName({ documentName, request, requestParameters })
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
