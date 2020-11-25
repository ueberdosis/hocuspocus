import syncProtocol from 'y-protocols/dist/sync.cjs'
import Encoder from './Encoder.js'
import { messageListener } from './bin/utils.js'
import awarenessProtocol from "y-protocols/dist/awareness.cjs";
import encoding from "lib0/dist/encoding.cjs";

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1

const WS_READY_STATE_CLOSING = 2
const WS_READY_STATE_CLOSED = 3

class Connection {

  connection
  request
  document
  timeout

  callbacks = {
    onClose: () => {},
  }

  pingInterval
  pongReceived = true

  constructor(connection, request, document, timeout) {
    this.connection = connection
    this.request = request
    this.document = document
    this.timeout = timeout

    this.connection.binaryType = 'arraybuffer'
    this.document.addConnection(this.connection)

    this.connection.on('message', message => messageListener(this.connection, this.document, new Uint8Array(message)))

    this.pingInterval = setInterval(this.check.bind(this), this.timeout)

    this.connection.on('pong', () => {
      this.pongReceived = true
    })

    this.connection.on('close', () => {
      this.close()
    })

    this._sendFirstSyncStep()
  }

  /**
   * Send the given message
   */
  send(message) {
    if (
      this.connection.readyState === WS_READY_STATE_CLOSING
      || this.connection.readyState === WS_READY_STATE_CLOSED
    ) {
      this.close()
    }

    try {
      this.connection.send(message, error => {
        if (error != null) this.close()
      })
    } catch (exception) {
      this.close()
    }
  }

  /**
   *
   * @returns {undefined}
   */
  check() {
    if (!this.pongReceived) {
      return this.close()
    }

    if (this.document.hasConnection(this.connection)) {
      this.pongReceived = false

      try {
        this.connection.ping()
      } catch (exception) {
        this.close()
      }
    }
  }

  /**
   * Close the connection
   */
  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    if (!this.document.hasConnection(this.connection)) {
      return
    }

    this.document.removeConnection(this.connection)

    // TODO: persistence
    // if persisted, we store state and destroy ydocument
    // persistence.writeState(doc.name, doc).then(() => {
    //   doc.destroy()
    // })

    this.callbacks.onClose(this.document)
    this.connection.close()
  }

  /**
   * Set a callback that will be triggered when the connection is closed
   * @param callback
   * @returns {Connection}
   */
  onClose(callback) {
    this.callbacks.onClose = callback

    return this
  }

  /**
   *
   * @private
   */
  _sendFirstSyncStep() {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(encoder, this.document)
    this.send(encoding.toUint8Array(encoder))

    // let syncMessage = new Encoder().int(MESSAGE_SYNC)
    //
    // syncProtocol.writeSyncStep1(syncMessage.encoder, this.document)
    // this.send(syncMessage.get())

    const awarenessStates = this.document.awareness.getStates()
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.document.awareness, Array.from(awarenessStates.keys())))
      this.send(encoding.toUint8Array(encoder))
    }
  }
}

export default Connection
