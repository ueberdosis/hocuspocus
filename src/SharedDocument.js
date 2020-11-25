import {Doc} from 'yjs'
import awarenessProtocol from 'y-protocols/dist/awareness.cjs'
import syncProtocol from "y-protocols/dist/sync.cjs";
import encoding from 'lib0/dist/encoding.cjs'
import mutex from 'lib0/dist/mutex.cjs'
import { send } from './bin/utils.js'

const messageSync = 0
const messageAwareness = 1

class SharedDocument extends Doc {

  constructor(name) {
    super({gc: true})

    this.name = name
    this.mutex = mutex.createMutex()
    this.conns = new Map()

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
    this.conns.set(connection, new Set())
  }

  hasConnection(connection) {
    return this.conns.has(connection)
  }

  removeConnection(connection) {
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      Array.from(this.conns.get(connection)),
      null
    )

    this.conns.delete(connection)
  }

  awarenessChangeHandler({added, updated, removed}, conn) {
    const changedClients = added.concat(updated, removed)
    if (conn !== null) {
      const connControlledIDs = /** @type {Set<number>} */ (this.conns.get(conn))
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
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients))
    const buff = encoding.toUint8Array(encoder)
    this.conns.forEach((_, c) => {
      send(this, c, buff)
    })
  }

  updateHandler(update, origin) {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeUpdate(encoder, update)
    const message = encoding.toUint8Array(encoder)
    this.conns.forEach((_, conn) => send(this, conn, message))
  }
}

export default SharedDocument
