import Y from 'yjs'
import awarenessProtocol from 'y-protocols/dist/awareness.cjs'
import syncProtocol from "y-protocols/dist/sync.cjs";
import encoding from 'lib0/dist/encoding.cjs'
import mutex from 'lib0/dist/mutex.cjs'
import Encoder from "./Encoder.js"
import {MESSAGE_AWARENESS, MESSAGE_SYNC} from './enums.js'

class SharedDocument extends Y.Doc {

  constructor(name) {
    super({gc: true})

    this.name = name
    this.mutex = mutex.createMutex()
    this.connections = new Map()

    this.awareness = new awarenessProtocol.Awareness(this)
    this.awareness.setLocalState(null)

    this.awareness.on('update', this._handleAwarenessUpdate.bind(this))
    this.on('update', this._handleUpdate.bind(this))

    // if (isCallbackSet) {
    //   this.on('update', debounce(
    //     callbackHandler,
    //     CALLBACK_DEBOUNCE_WAIT,
    //     {maxWait: CALLBACK_DEBOUNCE_MAXWAIT}
    //   ))
    // }
  }

  /**
   * Register connection on this document
   * @param connection
   */
  addConnection(connection) {
    this.connections.set(connection, new Set())
  }

  /**
   * Is the given connection registered on this document
   * @param connection
   * @returns {boolean}
   */
  hasConnection(connection) {
    return this.connections.has(connection)
  }

  /**
   * Remove the given connection from this document
   * @param connection
   */
  removeConnection(connection) {
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      Array.from(this.connections.get(connection)),
      null
    )

    this.connections.delete(connection)
  }

  /**
   * Get awareness states
   * @returns {*}
   */
  getAwarenessStates() {
    return this.awareness.getStates()
  }

  /**
   * Get awareness update message
   * @param changedClients
   * @returns {*}
   */
  getAwarenessUpdateMessage(changedClients = null) {
    const message = awarenessProtocol.encodeAwarenessUpdate(
      this.awareness,
      changedClients ? changedClients : Array.from(this.getAwarenessStates().keys())
    )

    return new Encoder()
      .int(MESSAGE_AWARENESS)
      .int8(message)
      .get()
  }

  /**
   * Handle an awareness update and sync changes to clients
   * @param clients
   * @param connection
   * @private
   */
  _handleAwarenessUpdate(clients, connection) {

    const {added, updated, removed} = clients
    const changedClients = added.concat(updated, removed)

    if (connection !== null) {
      const clientIDs = this.connections.get(connection)

      if (clientIDs !== undefined) {
        added.forEach(clientID => {
          clientIDs.add(clientID)
        })

        removed.forEach(clientID => {
          clientIDs.delete(clientID)
        })
      }
    }

    this.connections.forEach((set, connection) => {
      connection.send(
        this.getAwarenessUpdateMessage(changedClients)
      )
    })
  }

  /**
   * Handle an updated document and sync changes to clients
   * @param update
   * @private
   */
  _handleUpdate(update) {
    const syncMessage = new Encoder().int(MESSAGE_SYNC)
    syncProtocol.writeUpdate(syncMessage.encoder, update)

    this.connections.forEach((set, connection) => {
      connection.send(syncMessage.get())
    })
  }
}

export default SharedDocument
