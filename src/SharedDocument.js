import Y from 'yjs'
import awarenessProtocol from 'y-protocols/dist/awareness.cjs'
import syncProtocol from "y-protocols/dist/sync.cjs";
import encoding from 'lib0/dist/encoding.cjs'
import mutex from 'lib0/dist/mutex.cjs'
import {send} from './bin/utils.js'
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

    this.awareness.on('update', this.awarenessChangeHandler.bind(this))
    this.on('update', this.updateHandler.bind(this))

    // if (isCallbackSet) {
    //   this.on('update', debounce(
    //     callbackHandler,
    //     CALLBACK_DEBOUNCE_WAIT,
    //     {maxWait: CALLBACK_DEBOUNCE_MAXWAIT}
    //   ))
    // }
  }

  addConnection(connection) {
    this.connections.set(connection, new Set())
  }

  hasConnection(connection) {
    return this.connections.has(connection)
  }

  removeConnection(connection) {

    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      Array.from(this.connections.get(connection)),
      null
    )

    this.connections.delete(connection)
  }

  getAwarenessStates() {
    return this.awareness.getStates()
  }

  getAwarenessUpdateMessage() {
    const message = awarenessProtocol.encodeAwarenessUpdate(
      this.awareness,
      Array.from(this.getAwarenessStates().keys())
    )

    return new Encoder()
      .int(MESSAGE_AWARENESS)
      .int8(message)
      .get()
  }

  awarenessChangeHandler({added, updated, removed}, conn) {
    const changedClients = added.concat(updated, removed)
    if (conn !== null) {
      const connControlledIDs = /** @type {Set<number>} */ (this.connections.get(conn))
      if (connControlledIDs !== undefined) {
        added.forEach(clientID => {
          connControlledIDs.add(clientID)
        })
        removed.forEach(clientID => {
          connControlledIDs.delete(clientID)
        })
      }
    }
    // broadcast awareness update
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients))
    const buff = encoding.toUint8Array(encoder)

    this.connections.forEach((set, connection) => {
      connection.send(buff)
    })
  }

  updateHandler(update) {
    const message = new Encoder().int(MESSAGE_SYNC)

    syncProtocol.writeUpdate(message.encoder, update)

    this.connections.forEach((set, connection) => {
      connection.send(message.get())
    })
  }
}

export default SharedDocument
