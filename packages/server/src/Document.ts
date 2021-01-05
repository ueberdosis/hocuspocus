import { Awareness, removeAwarenessStates, applyAwarenessUpdate } from 'y-protocols/awareness'
import * as Y from 'yjs'
import Messages from './Messages'

class Document extends Y.Doc {

  callbacks = {
    onUpdate: (...args: any) => null,
  }

  connections = new Map()

  name: string

  awareness: any

  /**
   * Constructor.
   * @param name
   */
  constructor(name: string) {
    super({ gc: true })

    this.name = name

    // TODO: Class extends value undefined is not a constructor or null
    this.awareness = new Awareness(this) as any
    this.awareness.setLocalState(null)

    this.awareness.on('update', this.handleAwarenessUpdate.bind(this))
    this.on('update', this.handleUpdate.bind(this))
  }

  /**
   * Set a callback that will be triggered when the document is updated
   * @param callback
   * @returns {Document}
   */
  onUpdate(callback: any): Document {
    this.callbacks.onUpdate = callback

    return this
  }

  /**
   * Register connection on this document based on the
   * underlying websocket connection
   * @param connection
   */
  addConnection(connection: any): void {
    this.connections.set(connection.instance, {
      connection,
      clients: new Set(),
    })
  }

  /**
   * Is the given connection registered on this document
   * @param connection
   * @returns {boolean}
   */
  hasConnection(connection: any): boolean {
    return this.connections.has(connection.instance)
  }

  /**
   * Remove the given connection from this document
   * @param connection
   */
  removeConnection(connection: any): void {
    removeAwarenessStates(
      this.awareness,
      Array.from(this.getClients(connection.instance)),
      null,
    )

    this.connections.delete(connection.instance)
  }

  /**
   * Get the number of active connections
   * @returns {number}
   */
  connectionsCount(): number {
    return this.connections.size
  }

  /**
   * Get an array of registered connections
   * @returns {array}
   */
  getConnections(): any[] {
    return Array.from(this.connections.values()).map(data => data.connection)
  }

  /**
   * Get the client ids for the given connection instance
   * @param connectionInstance
   * @returns {Set}
   */
  getClients(connectionInstance: any): any {
    const connection = this.connections.get(connectionInstance)

    return connection.clients === undefined ? new Set() : connection.clients
  }

  /**
   * Has the document awareness states
   * @returns {boolean}
   */
  hasAwarenessStates(): boolean {
    return this.awareness.getStates().size > 0
  }

  /**
   * Apply the given awareness update
   * @param connection
   * @param update
   */
  applyAwarenessUpdate(connection: any, update: any): void {
    applyAwarenessUpdate(
      this.awareness,
      update,
      connection.instance,
    )
  }

  /**
   * Handle an awareness update and sync changes to clients
   * @param clients
   * @param connectionInstance
   * @private
   */
  handleAwarenessUpdate({ added, updated, removed }: any, connectionInstance: any): void {
    const changedClients = added.concat(updated, removed)
    const connection = this.connections.get(connectionInstance)

    if (connectionInstance !== null) {
      added.forEach((clientId: any) => connection.clients.add(clientId))
      removed.forEach((clientId: any) => connection.clients.delete(clientId))

      this.connections.set(connectionInstance, connection)
    }

    this.getConnections().forEach(connection => connection.send(
      Messages.awarenessUpdate(this.awareness, changedClients).encode(),
    ))
  }

  /**
   * Handle an updated document and sync changes to clients
   * @param update
   * @private
   */
  handleUpdate(update: any): void {
    this.callbacks.onUpdate(this, update)

    const message = Messages.update(update)

    this.getConnections().forEach(connection => connection.send(
      message.encode(),
    ))
  }
}

export default Document
