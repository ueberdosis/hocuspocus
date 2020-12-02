import awarenessProtocol from 'y-protocols/dist/awareness.cjs'
import Y from 'yjs'
import Messages from './Messages.js'

class Document extends Y.Doc {

  callbacks= {
    onUpdate: () => {},
  }

  connections = new Map()

  /**
   * Constructor.
   * @param name
   */
  constructor(name) {
    super({ gc: true })

    this.name = name

    this.awareness = new awarenessProtocol.Awareness(this)
    this.awareness.setLocalState(null)

    this.awareness.on('update', this.handleAwarenessUpdate.bind(this))
    this.on('update', this.handleUpdate.bind(this))
  }

  /**
   * Set a callback that will be triggered when the document is updated
   * @param callback
   * @returns {Document}
   */
  onUpdate(callback) {
    this.callbacks.onUpdate = callback

    return this
  }

  /**
   * Register connection on this document based on the
   * underlying websocket connection
   * @param connection
   */
  addConnection(connection) {
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
  hasConnection(connection) {
    return this.connections.has(connection.instance)
  }

  /**
   * Remove the given connection from this document
   * @param connection
   */
  removeConnection(connection) {
    awarenessProtocol.removeAwarenessStates(
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
  connectionsCount() {
    return this.connections.size
  }

  /**
   * Get an array of registered connections
   * @returns {array}
   */
  getConnections() {
    return Array.from(this.connections.values()).map(data => data.connection)
  }

  /**
   * Get the client ids for the given connection instance
   * @param connectionInstance
   * @returns {Set}
   */
  getClients(connectionInstance) {
    const connection = this.connections.get(connectionInstance)

    return connection.clients === undefined ? new Set() : connection.clients
  }

  /**
   * Has the document awareness states
   * @returns {boolean}
   */
  hasAwarenessStates() {
    return this.awareness.getStates().size > 0
  }

  /**
   * Apply the given awareness update
   * @param connection
   * @param update
   */
  applyAwarenessUpdate(connection, update) {
    awarenessProtocol.applyAwarenessUpdate(
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
  handleAwarenessUpdate({ added, updated, removed }, connectionInstance) {
    const changedClients = added.concat(updated, removed)
    const connection = this.connections.get(connectionInstance)

    if (connectionInstance !== null) {
      added.forEach(clientId => connection.clients.add(clientId))
      removed.forEach(clientId => connection.clients.delete(clientId))

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
  handleUpdate(update) {
    this.callbacks.onUpdate(this, update)

    const message = Messages.update(update)

    this.getConnections().forEach(connection => connection.send(
      message.encode(),
    ))
  }
}

export default Document
