import WebSocket from 'ws'
import { Awareness, removeAwarenessStates, applyAwarenessUpdate } from 'y-protocols/awareness'
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs'
import { mutex, createMutex } from 'lib0/mutex.js'
import { AwarenessUpdate } from './types'
import Connection from './Connection'
import { OutgoingMessage } from './OutgoingMessage'
import { Debugger } from './Debugger'

export class Document extends Doc {

  awareness: Awareness

  callbacks = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onUpdate: (document: Document, connection: Connection, update: Uint8Array) => {},
    beforeBroadcastStateless: (document: Document, stateless: string) => {},
  }

  connections: Map<WebSocket, {
    clients: Set<any>,
    connection: Connection
  }> = new Map()

  name: string

  mux: mutex

  logger: Debugger

  isLoading: boolean

  /**
   * Constructor.
   */
  constructor(name: string, logger: Debugger, yDocOptions: {}) {
    super(yDocOptions)

    this.name = name
    this.mux = createMutex()

    this.awareness = new Awareness(this)
    this.awareness.setLocalState(null)

    this.awareness.on('update', this.handleAwarenessUpdate.bind(this))
    this.on('update', this.handleUpdate.bind(this))

    this.logger = logger
    this.isLoading = true
  }

  /**
   * Check if the Document is empty
   */
  isEmpty(fieldName: string): boolean {
    // eslint-disable-next-line no-underscore-dangle
    return !this.get(fieldName)._start
  }

  /**
   * Merge the given document(s) into this one
   */
  merge(documents: Doc|Array<Doc>): Document {
    (Array.isArray(documents) ? documents : [documents]).forEach(document => {
      applyUpdate(this, encodeStateAsUpdate(document))
    })

    return this
  }

  /**
   * Set a callback that will be triggered when the document is updated
   */
  onUpdate(callback: (document: Document, connection: Connection, update: Uint8Array) => void): Document {
    this.callbacks.onUpdate = callback

    return this
  }

  /**
   * Set a callback that will be triggered before a stateless message is broadcasted
   */
  beforeBroadcastStateless(callback: (document: Document, stateless: string) => void): Document {
    this.callbacks.beforeBroadcastStateless = callback

    return this
  }

  /**
   * Register a connection and a set of clients on this document keyed by the
   * underlying websocket connection
   */
  addConnection(connection: Connection): Document {
    this.connections.set(connection.webSocket, {
      clients: new Set(),
      connection,
    })

    return this
  }

  /**
   * Is the given connection registered on this document
   */
  hasConnection(connection: Connection): boolean {
    return this.connections.has(connection.webSocket)
  }

  /**
   * Remove the given connection from this document
   */
  removeConnection(connection: Connection): Document {
    removeAwarenessStates(
      this.awareness,
      Array.from(this.getClients(connection.webSocket)),
      null,
    )

    this.connections.delete(connection.webSocket)

    return this
  }

  /**
   * Get the number of active connections for this document
   */
  getConnectionsCount(): number {
    return this.connections.size
  }

  /**
   * Get an array of registered connections
   */
  getConnections(): Array<Connection> {
    return Array.from(this.connections.values()).map(data => data.connection)
  }

  /**
   * Get the client ids for the given connection instance
   */
  getClients(connectionInstance: WebSocket): Set<any> {
    const connection = this.connections.get(connectionInstance)

    return connection?.clients === undefined ? new Set() : connection.clients
  }

  /**
   * Has the document awareness states
   */
  hasAwarenessStates(): boolean {
    return this.awareness.getStates().size > 0
  }

  /**
   * Apply the given awareness update
   */
  applyAwarenessUpdate(connection: Connection, update: Uint8Array): Document {
    applyAwarenessUpdate(
      this.awareness,
      update,
      connection.webSocket,
    )

    return this
  }

  /**
   * Handle an awareness update and sync changes to clients
   * @private
   */
  private handleAwarenessUpdate(
    { added, updated, removed }: AwarenessUpdate,
    connectionInstance: WebSocket,
  ): Document {
    const changedClients = added.concat(updated, removed)

    if (connectionInstance !== null) {
      const connection = this.connections.get(connectionInstance)

      if (connection) {
        added.forEach((clientId: any) => connection.clients.add(clientId))
        removed.forEach((clientId: any) => connection.clients.delete(clientId))
      }
    }

    this.getConnections().forEach(connection => {
      const awarenessMessage = new OutgoingMessage()
        .createAwarenessUpdateMessage(this.awareness, changedClients)

      this.logger.log({
        direction: 'out',
        type: awarenessMessage.type,
        category: awarenessMessage.category,
      })

      connection.send(
        awarenessMessage.toUint8Array(),
      )
    })

    return this
  }

  /**
   * Handle an updated document and sync changes to clients
   */
  private handleUpdate(update: Uint8Array, connection: Connection): Document {
    this.callbacks.onUpdate(this, connection, update)

    const message = new OutgoingMessage()
      .createSyncMessage()
      .writeUpdate(update)

    this.getConnections().forEach(connection => {
      this.logger.log({
        direction: 'out',
        type: message.type,
        category: message.category,
      })

      connection.send(
        message.toUint8Array(),
      )
    })

    return this
  }

  /**
   * Broadcast stateless message to all connections
   */
  public broadcastStateless(payload: string): void {
    this.callbacks.beforeBroadcastStateless(this, payload)

    this.getConnections().forEach(connection => {
      connection.sendStateless(payload)
    })
  }
}

export default Document
