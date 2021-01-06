import WebSocket from 'ws'
import { IncomingMessage } from 'http'
import Decoder from './utils/Decoder'
import Document from './Document'
import Messages from './Messages'
import { MessageTypes, WsReadyStates } from './types'

class Connection {

  connection: WebSocket

  context: any

  document: Document

  pingInterval: NodeJS.Timeout

  pongReceived = true

  request: IncomingMessage

  timeout: number

  callbacks: any = {
    onClose: (document: Document) => null,
  }

  /**
   * Constructor.
   */
  constructor(
    connection: WebSocket,
    request: IncomingMessage,
    document: Document,
    timeout: number,
    context: any,
  ) {
    this.connection = connection
    this.context = context
    this.document = document
    this.request = request
    this.timeout = timeout

    this.connection.binaryType = 'arraybuffer'
    this.document.addConnection(this)

    this.pingInterval = setInterval(this.check.bind(this), this.timeout)

    this.connection.on('close', this.close.bind(this))
    this.connection.on('message', this.handleMessage.bind(this))
    this.connection.on('pong', () => { this.pongReceived = true })

    this.sendFirstSyncStep()
  }

  /**
   * Set a callback that will be triggered when the connection is closed
   */
  onClose(callback: (document: Document) => void): Connection {
    this.callbacks.onClose = callback

    return this
  }

  /**
   * Send the given message
   */
  send(message: any): void {
    if (
      this.connection.readyState === WsReadyStates.Closing
      || this.connection.readyState === WsReadyStates.Closed
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
  close(): void {
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
   * @private
   */
  private check(): void {
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
  private sendFirstSyncStep(): void {
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
   * @private
   */
  private handleMessage(input: Iterable<number>): void {
    const message = new Decoder(new Uint8Array(input))
    const messageType = message.int()

    if (messageType === MessageTypes.Awareness) {
      this.document.applyAwarenessUpdate(this, message.int8())
      return
    }

    const syncMessage = Messages.read(message, this.document)

    return this.send(
      syncMessage.encode(),
    )
  }

  /**
   * Get the underlying connection instance
   */
  get instance(): WebSocket {
    return this.connection
  }
}

export default Connection
