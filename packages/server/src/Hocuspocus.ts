import * as decoding from 'lib0/decoding'
import WebSocket, { AddressInfo, WebSocketServer } from 'ws'
import { createServer, IncomingMessage, Server as HTTPServer } from 'http'
import { Doc, encodeStateAsUpdate, applyUpdate } from 'yjs'
import { URLSearchParams } from 'url'
import { v4 as uuid } from 'uuid'
import kleur from 'kleur'
import {
  ResetConnection,
  Unauthorized,
  Forbidden,
  CloseEvent,
  awarenessStatesToArray,
  WsReadyStates,
} from '@hocuspocus/common'
import {
  MessageType,
  Configuration,
  ConnectionConfiguration,
  HookName,
  AwarenessUpdate,
  HookPayload, beforeHandleMessagePayload,
} from './types'
import Document from './Document'
import Connection from './Connection'
import { OutgoingMessage } from './OutgoingMessage'
import meta from '../package.json' assert { type: 'json' }
import { Debugger } from './Debugger'
import { onListenPayload } from '.'

export const defaultConfiguration = {
  name: null,
  port: 80,
  timeout: 30000,
  debounce: 2000,
  maxDebounce: 10000,
  quiet: false,
  yDocOptions: {
    gc: true,
    gcFilter: () => true,
  },
}

const defaultOnCreateDocument = () => new Promise(r => r(null))

/**
 * Hocuspocus Server
 */
export class Hocuspocus {
  configuration: Configuration = {
    ...defaultConfiguration,
    extensions: [],
    onConfigure: () => new Promise(r => r(null)),
    onListen: () => new Promise(r => r(null)),
    onUpgrade: () => new Promise(r => r(null)),
    onConnect: () => new Promise(r => r(null)),
    connected: () => new Promise(r => r(null)),
    beforeHandleMessage: () => new Promise(r => r(null)),
    onChange: () => new Promise(r => r(null)),
    onCreateDocument: defaultOnCreateDocument,
    onLoadDocument: () => new Promise(r => r(null)),
    onStoreDocument: () => new Promise(r => r(null)),
    afterStoreDocument: () => new Promise(r => r(null)),
    onAwarenessUpdate: () => new Promise(r => r(null)),
    onRequest: () => new Promise(r => r(null)),
    onDisconnect: () => new Promise(r => r(null)),
    onDestroy: () => new Promise(r => r(null)),
  }

  documents: Map<string, Document> = new Map()

  httpServer?: HTTPServer

  webSocketServer?: WebSocketServer

  debugger = new Debugger()

  constructor(configuration?: Partial<Configuration>) {
    if (configuration) {
      this.configure(configuration)
    }
  }

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

    this.configuration.extensions.sort((a, b) => {
      const one = typeof a.priority === 'undefined' ? 100 : a.priority
      const two = typeof b.priority === 'undefined' ? 100 : b.priority

      if (one > two) {
        return -1
      }

      if (one < two) {
        return 1
      }

      return 0
    })

    this.configuration.extensions.push({
      onConfigure: this.configuration.onConfigure,
      onListen: this.configuration.onListen,
      onUpgrade: this.configuration.onUpgrade,
      onConnect: this.configuration.onConnect,
      connected: this.configuration.connected,
      onAuthenticate: this.configuration.onAuthenticate,
      onLoadDocument,
      beforeHandleMessage: this.configuration.beforeHandleMessage,
      onChange: this.configuration.onChange,
      onStoreDocument: this.configuration.onStoreDocument,
      afterStoreDocument: this.configuration.afterStoreDocument,
      onAwarenessUpdate: this.configuration.onAwarenessUpdate,
      onRequest: this.configuration.onRequest,
      onDisconnect: this.configuration.onDisconnect,
      onDestroy: this.configuration.onDestroy,
    })

    this.hooks('onConfigure', {
      configuration: this.configuration,
      version: meta.version,
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
  ): Promise<Hocuspocus> {
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

      incoming.on('error', error => {
        /**
         * Handle a ws instance error, which is required to prevent
         * the server from crashing when one happens
         * See https://github.com/websockets/ws/issues/1777#issuecomment-660803472
         * @private
         */
        this.debugger.log('Error emitted from webSocket instance:')
        this.debugger.log(error)
      })

      this.handleConnection(incoming, request, await this.getDocumentNameFromRequest(request))
    })

    const server = createServer((request, response) => {
      this.hooks('onRequest', { request, response, instance: this })
        .then(() => {
          // default response if all prior hooks don't interfere
          response.writeHead(200, { 'Content-Type': 'text/plain' })
          response.end('OK')
        })
        .catch(error => {
          // if a hook rejects and the error is empty, do nothing
          // this is only meant to prevent later hooks and the
          // default handler to do something. if a error is present
          // just rethrow it
          if (error) {
            throw error
          }
        })
    })

    server.on('upgrade', (request, socket, head) => {
      this.hooks('onUpgrade', {
        request,
        socket,
        head,
        instance: this,
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
        .catch(error => {
          // if a hook rejects and the error is empty, do nothing
          // this is only meant to prevent later hooks and the
          // default handler to do something. if a error is present
          // just rethrow it
          if (error) {
            throw error
          }
        })
    })

    this.httpServer = server
    this.webSocketServer = webSocketServer

    return new Promise((resolve: Function, reject: Function) => {
      server.listen(this.configuration.port, () => {
        if (!this.configuration.quiet && process.env.NODE_ENV !== 'testing') {
          this.showStartScreen()
        }

        const onListenPayload = {
          instance: this,
          configuration: this.configuration,
          port: this.address.port,
        }

        this.hooks('onListen', onListenPayload)
          .then(() => resolve(this))
          .catch(error => reject(error))
      })
    })
  }

  get address(): AddressInfo {
    return (this.httpServer?.address() || {
      port: this.configuration.port,
      address: '127.0.0.1',
      family: 'IPv4',
    }) as AddressInfo
  }

  get URL(): string {
    return `127.0.0.1:${this.address.port}`
  }

  get webSocketURL(): string {
    return `ws://${this.URL}`
  }

  get httpURL(): string {
    return `http://${this.URL}`
  }

  private showStartScreen() {
    const name = this.configuration.name ? ` (${this.configuration.name})` : ''

    console.log()
    console.log(`  ${kleur.cyan(`Hocuspocus v${meta.version}${name}`)}${kleur.green(' running at:')}`)
    console.log()
    console.log(`  > HTTP: ${kleur.cyan(`${this.httpURL}`)}`)
    console.log(`  > WebSocket: ${this.webSocketURL}`)

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

      document.connections.forEach(({ connection }) => {
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
    } catch (error) {
      console.error(error)
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

      this.hooks('connected', hookPayload)
    }

    // This listener handles authentication messages and queues everything else.
    const queueIncomingMessageListener = (data: Uint8Array) => {
      try {
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
              return setUpNewConnection(queueIncomingMessageListener)
            })
            .catch((error = Forbidden) => {
              const message = new OutgoingMessage().writePermissionDenied(error.reason ?? 'permission-denied')

              this.debugger.log({
                direction: 'out',
                type: message.type,
                category: message.category,
              })

              // Ensure that the permission denied message is sent before the
              // connection is closed
              incoming.send(message.toUint8Array(), () => {
                incoming.close(error.code ?? Forbidden.code, error.reason ?? Forbidden.reason)
                incoming.off('message', queueIncomingMessageListener)
              })
            })
        } else {
          // It’s not the Auth message we’re waiting for, so just queue it.
          incomingMessageQueue.push(data)
        }

      // Catch errors due to failed decoding of data
      } catch (error) {
        incoming.close(Unauthorized.code, Unauthorized.reason)
        incoming.off('message', queueIncomingMessageListener)
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
        return setUpNewConnection(queueIncomingMessageListener)
      })
      .catch((error = Forbidden) => {
        // if a hook interrupts, close the websocket connection
        incoming.close(error.code ?? Forbidden.code, error.reason ?? Forbidden.reason)
        incoming.off('message', queueIncomingMessageListener)
      })
  }

  /**
   * Handle update of the given document
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

    this.hooks('onChange', hookPayload).catch(error => {
      throw error
    })

    // If the update was received through other ways than the
    // WebSocket connection, we don’t need to feel responsible for
    // storing the content.
    if (!connection) {
      return
    }

    this.debounce(`onStoreDocument-${document.name}`, () => {
      this.hooks('onStoreDocument', hookPayload)
        .catch(error => {
          if (error?.message) {
            throw error
          }
        })
        .then(() => {
          this.hooks('afterStoreDocument', hookPayload)
        })
    })
  }

  timers: Map<string, {
    timeout: NodeJS.Timeout,
    start: number
  }> = new Map()

  /**
   * debounce the given function, using the given identifier
   */
  debounce(id: string, func: Function, immediately = false) {
    const old = this.timers.get(id)
    const start = old?.start || Date.now()

    const run = () => {
      this.timers.delete(id)
      func()
    }

    if (old?.timeout) {
      clearTimeout(old.timeout)
    }

    if (immediately) {
      return run()
    }

    if (Date.now() - start >= this.configuration.maxDebounce) {
      return run()
    }

    this.timers.set(id, {
      start,
      timeout: setTimeout(run, this.configuration.debounce),
    })
  }

  /**
   * Create a new document by the given request
   */
  private async createDocument(documentName: string, request: IncomingMessage, socketId: string, connection: ConnectionConfiguration, context?: any): Promise<Document> {
    if (this.documents.has(documentName)) {
      const document = this.documents.get(documentName)

      if (document) {
        return document
      }
    }

    const document = new Document(documentName, this.debugger, this.configuration.yDocOptions)
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

    try {
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
    } catch (e) {
      this.closeConnections(documentName)
      this.documents.delete(documentName)
      throw e
    }

    document.isLoading = false
    await this.hooks('afterLoadDocument', hookPayload)

    document.onUpdate((document: Document, connection: Connection, update: Uint8Array) => {
      this.handleDocumentUpdate(document, connection, update, request, connection?.socketId)
    })

    document.awareness.on('update', (update: AwarenessUpdate) => {
      this.hooks('onAwarenessUpdate', {
        ...hookPayload,
        ...update,
        awareness: document.awareness,
        states: awarenessStatesToArray(document.awareness.getStates()),
      })
    })

    return document
  }

  /**
   * Create a new connection by the given request and document
   */
  private createConnection(connection: WebSocket, request: IncomingMessage, document: Document, socketId: string, readOnly = false, context?: any): Connection {
    const instance = new Connection(
      connection,
      request,
      document,
      this.configuration.timeout,
      socketId,
      context,
      readOnly,
      this.debugger,
    )

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

      // Check if there are still no connections to the document, as these hooks
      // may take some time to resolve (e.g. database queries). If a
      // new connection were to come in during that time it would rely on the
      // document in the map that we remove now.
      if (document.getConnectionsCount() > 0) {
        return
      }

      // If it’s the last connection, we need to make sure to store the
      // document. Use the debounce helper, to clear running timers,
      // but make it run immediately (`true`).
      // Only run this if the document has finished loading earlier (i.e. not to persist the empty
      // ydoc if the onLoadDocument hook returned an error)
      if (!document.isLoading) {
        this.debounce(`onStoreDocument-${document.name}`, () => {
          this.hooks('onStoreDocument', hookPayload)
            .catch(error => {
              if (error?.message) {
                throw error
              }
            })
            .then(() => {
              this.hooks('afterStoreDocument', hookPayload)
            })
        }, true)

      }

      // Remove document from memory.
      this.documents.delete(document.name)
      document.destroy()
    })
    instance.beforeHandleMessage((document, update) => {
      const hookPayload: beforeHandleMessagePayload = {
        instance: this,
        clientsCount: document.getConnectionsCount(),
        context,
        document,
        socketId,
        documentName: document.name,
        requestHeaders: request.headers,
        requestParameters: Hocuspocus.getParameters(request),
        update,
      }

      return this.hooks('beforeHandleMessage', hookPayload)
    })

    // If the WebSocket has already disconnected (wow, that was fast) – then
    // immediately call close to cleanup the connection and document in memory.
    if (
      connection.readyState === WsReadyStates.Closing
      || connection.readyState === WsReadyStates.Closed
    ) {
      instance.close()
    }

    return instance
  }

  /**
   * Run the given hook on all configured extensions.
   * Runs the given callback after each hook.
   */
  hooks(name: HookName, payload: HookPayload, callback: Function | null = null): Promise<any> {
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
          .then(() => (extension[name] as any)?.(payload))
          .catch(error => {
            // make sure to log error messages
            if (error?.message) {
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
   */
  private static getParameters(request: IncomingMessage): URLSearchParams {
    const query = request?.url?.split('?') || []
    return new URLSearchParams(query[1] ? query[1] : '')
  }

  /**
   * Get document name by the given request
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
