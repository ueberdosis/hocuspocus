import Encoder from './Encoder.js'
import encoding from "lib0/dist/encoding.cjs"
import {MESSAGE_SYNC, WS_READY_STATE_CLOSING, WS_READY_STATE_CLOSED} from './enums.js'
import syncProtocol from 'y-protocols/dist/sync.cjs'
import {messageListener} from './bin/utils.js'

class Connection {

  connection
  request
  document
  timeout

  callbacks = {
    onClose: () => {
    },
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
    let syncMessage = new Encoder().int(MESSAGE_SYNC)

    syncProtocol.writeSyncStep1(syncMessage.encoder, this.document)
    this.send(syncMessage.get())

    if (this.document.getAwarenessStates().size > 0) {
      this.send(this.document.getAwarenessUpdateMessage())
    }
  }
}

export default Connection
