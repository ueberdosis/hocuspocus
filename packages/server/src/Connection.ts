import AsyncLock from 'async-lock'
import WebSocket from 'ws'
import { IncomingMessage as HTTPIncomingMessage } from 'http'

import Document from './Document'
import { IncomingMessage } from './IncomingMessage'
import { WsReadyStates } from './types'
import { OutgoingMessage } from './OutgoingMessage'
import { MessageReceiver } from './MessageReceiver'

class Connection {

  connection: WebSocket

  context: any

  document: Document

  pingInterval: NodeJS.Timeout

  pongReceived = true

  request: HTTPIncomingMessage

  timeout: number

  callbacks: any = {
    onClose: (document: Document) => null,
  }

  socketId: string

  lock: AsyncLock

  readOnly: Boolean

  /**
   * Constructor.
   */
  constructor(
    connection: WebSocket,
    request: HTTPIncomingMessage,
    document: Document,
    timeout: number,
    socketId: string,
    context: any,
    readOnly = false,
  ) {
    this.connection = connection
    this.context = context
    this.document = document
    this.request = request
    this.timeout = timeout
    this.socketId = socketId
    this.readOnly = readOnly

    this.lock = new AsyncLock()

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
   * Graceful wrapper around the WebSocket close method.
   */
  close(code?: number | undefined, data?: string | undefined): void {
    this.lock.acquire('close', (done: Function) => {

      if (this.pingInterval) {
        clearInterval(this.pingInterval)
      }

      if (!this.document.hasConnection(this)) {
        return
      }

      this.document.removeConnection(this)
      this.callbacks.onClose(this.document)
      this.connection.close(code, data)

      done()

    })
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
      new OutgoingMessage()
        .createSyncMessage()
        .writeFirstSyncStepFor(this.document)
        .toUint8Array(),
    )

    if (!this.document.hasAwarenessStates()) {
      return
    }

    this.send(
      new OutgoingMessage()
        .createAwarenessUpdateMessage(this.document.awareness)
        .toUint8Array(),
    )
  }

  /**
   * Handle an incoming message
   * @private
   */
  private handleMessage(data: Iterable<number>): void {
    new MessageReceiver(
      new IncomingMessage(data),
    ).apply(this)
  }

  /**
   * Get the underlying connection instance
   */
  get instance(): WebSocket {
    return this.connection
  }
}

export default Connection
