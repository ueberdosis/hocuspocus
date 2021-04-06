import WebSocket from 'ws'
import { Awareness, removeAwarenessStates, applyAwarenessUpdate } from 'y-protocols/awareness'
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs'
import { mutex, createMutex } from 'lib0/mutex.js'

import { AwarenessUpdate } from './types'
import Connection from './Connection'
import { OutgoingMessage } from './OutgoingMessage'

class Document extends Doc {

  awareness: Awareness

  callbacks = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onUpdate: (document: Document, connection: Connection, update: Uint8Array) => {},
  }

  connections = new Map()

  name: string

  mux: mutex

  /**
   * Constructor.
   */
  constructor(name: string) {
    super({ gc: true })

    this.name = name
    this.mux = createMutex()

    this.awareness = new Awareness(this)
    this.awareness.setLocalState(null)

    this.awareness.on('update', this.handleAwarenessUpdate.bind(this))
    this.on('update', this.handleUpdate.bind(this))
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
   * Register a connection and a set of clients on this document keyed by the
   * underlying websocket connection
   */
  addConnection(connection: Connection): Document {
    this.connections.set(connection.instance, {
      clients: new Set(),
      connection,
    })

    return this
  }

  /**
   * Is the given connection registered on this document
   */
  hasConnection(connection: Connection): boolean {
    return this.connections.has(connection.instance)
  }

  /**
   * Remove the given connection from this document
   */
  removeConnection(connection: Connection): Document {
    removeAwarenessStates(
      this.awareness,
      Array.from(this.getClients(connection.instance)),
      null,
    )

    this.connections.delete(connection.instance)

    return this
  }

  /**
   * Get the number of active connections
   */
  connectionsCount(): number {
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

    return connection.clients === undefined ? new Set() : connection.clients
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
      connection.instance,
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

    this.getConnections().forEach(connection => connection.send(
      new OutgoingMessage()
        .createAwarenessUpdateMessage(this.awareness, changedClients)
        .toUint8Array(),
    ))

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

    this.getConnections().forEach(connection => connection.send(
      message.toUint8Array(),
    ))

    return this
  }
}

export default Document
