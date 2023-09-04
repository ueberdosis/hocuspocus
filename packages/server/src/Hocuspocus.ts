import { IncomingMessage } from 'http'
import { ListenOptions } from 'net'
import {
  ResetConnection, awarenessStatesToArray,
} from '@hocuspocus/common'
import kleur from 'kleur'
import { v4 as uuid } from 'uuid'
import WebSocket, { AddressInfo } from 'ws'
import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs'
import meta from '../package.json' assert { type: 'json' }
import { Server as HocuspocusServer } from './Server'
import { ClientConnection } from './ClientConnection.js'
// TODO: would be nice to only have a dependency on ClientConnection, and not on Connection
import Connection from './Connection.js'
import { Debugger } from './Debugger.js'
import { DirectConnection } from './DirectConnection.js'
import Document from './Document.js'
import {
  AwarenessUpdate,
  Configuration,
  ConnectionConfiguration,
  HookName,
  HookPayloadByName,
  beforeBroadcastStatelessPayload,
  onChangePayload,
  onDisconnectPayload,
  onListenPayload,
  onStoreDocumentPayload,
} from './types.js'
import { getParameters } from './util/getParameters.js'
import { useDebounce } from './util/debounce'

export const defaultConfiguration = {
  name: null,
  port: 80,
  address: '0.0.0.0',
  timeout: 30000,
  debounce: 2000,
  maxDebounce: 10000,
  quiet: false,
  yDocOptions: {
    gc: true,
    gcFilter: () => true,
  },
  unloadImmediately: true,
}

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
    beforeBroadcastStateless: () => new Promise(r => r(null)),
    onStateless: () => new Promise(r => r(null)),
    onChange: () => new Promise(r => r(null)),
    onLoadDocument: () => new Promise(r => r(null)),
    onStoreDocument: () => new Promise(r => r(null)),
    afterStoreDocument: () => new Promise(r => r(null)),
    onAwarenessUpdate: () => new Promise(r => r(null)),
    onRequest: () => new Promise(r => r(null)),
    onDisconnect: () => new Promise(r => r(null)),
    onDestroy: () => new Promise(r => r(null)),
  }

  documents: Map<string, Document> = new Map()

  server?: HocuspocusServer

  debugger = new Debugger()

  debounce = useDebounce()

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
      onLoadDocument: this.configuration.onLoadDocument,
      beforeHandleMessage: this.configuration.beforeHandleMessage,
      beforeBroadcastStateless: this.configuration.beforeBroadcastStateless,
      onStateless: this.configuration.onStateless,
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

    this.server = new HocuspocusServer(this)

    return new Promise((resolve: Function, reject: Function) => {
      this.server?.httpServer.listen({
        port: this.configuration.port,
        host: this.configuration.address,
      } as ListenOptions, async () => {
        if (!this.configuration.quiet && process.env.NODE_ENV !== 'testing') {
          this.showStartScreen()
        }

        const onListenPayload = {
          instance: this,
          configuration: this.configuration,
          port: this.address.port,
        }

        try {
          await this.hooks('onListen', onListenPayload)
          resolve(this)
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  get address(): AddressInfo {
    return (this.server?.httpServer?.address() || {
      port: this.configuration.port,
      address: this.configuration.address,
      family: 'IPv4',
    }) as AddressInfo
  }

  get URL(): string {
    return `${this.configuration.address}:${this.address.port}`
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
      return extension.extensionName ?? extension.constructor?.name
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
    this.server?.httpServer?.close()

    try {
      this.server?.webSocketServer?.close()
      this.server?.webSocketServer?.clients.forEach(client => {
        client.terminate()
      })
    } catch (error) {
      console.error(error)
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
   * … and if nothing fails it’ll fully establish the connection and
   * load the Document then.
   */
  handleConnection(incoming: WebSocket, request: IncomingMessage, defaultContext: any = {}): void {
    const clientConnection = new ClientConnection(incoming, request, this, this.hooks.bind(this), this.debugger, {
      requiresAuthentication: this.requiresAuthentication,
      timeout: this.configuration.timeout,
    }, defaultContext)
    clientConnection.onClose((document: Document, hookPayload: onDisconnectPayload) => {
      // Check if there are still no connections to the document, as these hooks
      // may take some time to resolve (e.g. database queries). If a
      // new connection were to come in during that time it would rely on the
      // document in the map that we remove now.
      if (document.getConnectionsCount() > 0) {
        return
      }

      // If it’s the last connection, we need to make sure to store the
      // document. Use the debounce helper, to clear running timers,
      // but make it run immediately if configured.
      // Only run this if the document has finished loading earlier (i.e. not to persist the empty
      // ydoc if the onLoadDocument hook returned an error)
      if (!document.isLoading) {
        this.debounce(
          `onStoreDocument-${document.name}`,
          () => {
            this.storeDocumentHooks(document, hookPayload)
          },
          this.configuration.unloadImmediately ? 0 : this.configuration.debounce,
          this.configuration.maxDebounce,
        )
      } else {
        // Remove document from memory immediately
        this.unloadDocument(document)
      }
    })
  }

  /**
   * Handle update of the given document
   *
   * "connection" is not necessarily type "Connection", it's the Yjs "origin" (which is "Connection" if
   * the update is incoming from the provider, but can be anything if the updates is originated from an extension.
   */
  private handleDocumentUpdate(document: Document, connection: Connection | undefined, update: Uint8Array, request?: IncomingMessage): void {
    const hookPayload: onChangePayload | onStoreDocumentPayload = {
      instance: this,
      clientsCount: document.getConnectionsCount(),
      context: connection?.context || {},
      document,
      documentName: document.name,
      requestHeaders: request?.headers ?? {},
      requestParameters: getParameters(request),
      socketId: connection?.socketId ?? '',
      update,
      transactionOrigin: connection,
    }

    this.hooks('onChange', hookPayload).catch(error => {
      // TODO: what's the intention of this catch -> throw?
      throw error
    })

    // If the update was received through other ways than the
    // WebSocket connection, we don’t need to feel responsible for
    // storing the content.
    if (!connection) {
      return
    }

    this.debounce(
      `onStoreDocument-${document.name}`,
      () => {
        this.storeDocumentHooks(document, hookPayload)
      },
      this.configuration.debounce,
      this.configuration.maxDebounce,
    )
  }

  /**
   * Create a new document by the given request
   */
  public async createDocument(documentName: string, request: Partial<Pick<IncomingMessage, 'headers' | 'url'>>, socketId: string, connection: ConnectionConfiguration, context?: any): Promise<Document> {
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
      requestHeaders: request.headers ?? {},
      requestParameters: getParameters(request),
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
      this.unloadDocument(document)
      throw e
    }

    document.isLoading = false
    await this.hooks('afterLoadDocument', hookPayload)

    document.onUpdate((document: Document, connection: Connection, update: Uint8Array) => {
      this.handleDocumentUpdate(document, connection, update, connection?.request)
    })

    document.beforeBroadcastStateless((document: Document, stateless: string) => {
      const hookPayload: beforeBroadcastStatelessPayload = {
        document,
        documentName: document.name,
        payload: stateless,
      }

      this.hooks('beforeBroadcastStateless', hookPayload)
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

  storeDocumentHooks(document: Document, hookPayload: onStoreDocumentPayload) {
    this.hooks('onStoreDocument', hookPayload)
      .catch(error => {
        if (error?.message) {
          throw error
        }
      })
      .then(() => {
        this.hooks('afterStoreDocument', hookPayload).then(() => {
        // Remove document from memory.

          if (document.getConnectionsCount() > 0) {
            return
          }

          this.unloadDocument(document)
        })
      })
  }

  /**
   * Run the given hook on all configured extensions.
   * Runs the given callback after each hook.
   */
  hooks<T extends HookName>(name: T, payload: HookPayloadByName[T], callback: Function | null = null): Promise<any> {
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

  unloadDocument(document: Document) {
    const documentName = document.name
    if (!this.documents.has(documentName)) return

    this.documents.delete(documentName)
    document.destroy()
    this.hooks('afterUnloadDocument', { instance: this, documentName })
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

  async openDirectConnection(documentName: string, context?: any): Promise<DirectConnection> {
    const connectionConfig: ConnectionConfiguration = {
      isAuthenticated: true,
      readOnly: false,
      requiresAuthentication: true,
    }

    const document: Document = await this.createDocument(
      documentName,
      {}, // direct connection has no request params
      uuid(),
      connectionConfig,
      context,
    )

    return new DirectConnection(document, this, context)
  }
}

export const Server = new Hocuspocus()
