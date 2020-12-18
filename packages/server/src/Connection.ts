import WebSocket from 'ws'
import Decoder from './Decoder'
import Messages from './Messages'
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from './utils/messageTypes'
import { WS_READY_STATE_CLOSING, WS_READY_STATE_CLOSED } from './utils/readyStates'

class Connection {

  connection: WebSocket

  context: any

  document: any

  pingInterval: any

  pongReceived = true

  request: any

  timeout: any

  callbacks: any = {
    onClose: (...args: any) => null,
    onChange: (...args: any) => null,
  }

  /**
   * Constructor.
   * @param connection
   * @param request
   * @param document
   * @param timeout
   * @param context
   */
  constructor(connection: WebSocket, request: any, document: any, timeout: any, context: any) {
    this.connection = connection
    this.context = context
    this.document = document
    this.request = request
    this.timeout = timeout

    this.connection.binaryType = 'arraybuffer'
    this.document.addConnection(this)

    this.pingInterval = setInterval(this.check.bind(this), this.timeout)

    this.connection.on('close', () => this.close())
    this.connection.on('message', (message: any) => this.handleMessage(message))
    this.connection.on('pong', () => { this.pongReceived = true })

    this.sendFirstSyncStep()
  }

  /**
   * Set a callback that will be triggered when the connection is closed
   * @param callback
   * @returns {Connection}
   */
  onClose(callback: any) {
    this.callbacks.onClose = callback

    return this
  }

  /**
   * Send the given message
   */
  send(message: any) {
    if (
      this.connection.readyState === WS_READY_STATE_CLOSING
      || this.connection.readyState === WS_READY_STATE_CLOSED
    ) {
      this.close()
    }

    try {
      this.connection.send(message, (error: any) => {
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
  handleMessage(input: any) {
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
