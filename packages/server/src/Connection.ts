import Decoder from './Decoder.js'
import Messages from './Messages.js'
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from './utils/messageTypes.js'
import { WS_READY_STATE_CLOSING, WS_READY_STATE_CLOSED } from './utils/readyStates.js'

class Connection {

  connection

  context

  document

  pingInterval

  pongReceived = true

  request

  timeout

  callbacks = {
    onClose: () => {
    },
    onChange: () => {
    },
  }

  /**
   * Constructor.
   * @param connection
   * @param request
   * @param document
   * @param timeout
   * @param context
   */
  constructor(connection, request, document, timeout, context) {
    this.connection = connection
    this.context = context
    this.document = document
    this.request = request
    this.timeout = timeout

    this.connection.binaryType = 'arraybuffer'
    this.document.addConnection(this)

    this.pingInterval = setInterval(this.check.bind(this), this.timeout)

    this.connection.on('close', () => this.close())
    this.connection.on('message', message => this.handleMessage(message))
    this.connection.on('pong', () => { this.pongReceived = true })

    this.sendFirstSyncStep()
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
   * Close the connection
   */
  close() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    if (!this.document.hasConnection(this)) {
      return
    }

    this.document.removeConnection(this)

    this.callbacks.onClose(this.document)
    this.connection.close()
  }

  /**
   * Check if pong was received and close the connection otherwise
   * @returns {undefined}
   * @private
   */
  check() {
    if (!this.pongReceived) {
      return this.close()
    }

    if (this.document.hasConnection(this)) {
      this.pongReceived = false

      try {
        this.connection.ping()
      } catch (exception) {
        this.close()
      }
    }
  }

  /**
   * Send first sync step
   * @private
   */
  sendFirstSyncStep() {
    this.send(
      Messages.firstSyncStep(this.document).encode(),
    )

    if (!this.document.hasAwarenessStates()) {
      return
    }

    this.send(
      Messages.awarenessUpdate(this.document.awareness).encode(),
    )
  }

  /**
   * Handle an incoming message
   * @param input
   * @private
   */
  handleMessage(input) {
    const message = new Decoder(new Uint8Array(input))
    const messageType = message.int()

    if (messageType === MESSAGE_AWARENESS) {
      return this.document.applyAwarenessUpdate(this, message.int8())
    }

    const syncMessage = Messages.read(message, this.document)

    if (messageType === MESSAGE_SYNC && syncMessage.length() > 1) {
      return this.send(
        syncMessage.encode(),
      )
    }
  }

  /**
   * Get the underlying connection instance
   * @returns {*}
   */
  get instance() {
    return this.connection
  }
}

export default Connection
