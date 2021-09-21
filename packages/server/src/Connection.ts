import AsyncLock from 'async-lock'
import WebSocket from 'ws'
import { IncomingMessage as HTTPIncomingMessage } from 'http'

import Document from './Document'
import { IncomingMessage } from './IncomingMessage'
import { CloseEvent, WsReadyStates } from './types'
import { OutgoingMessage } from './OutgoingMessage'
import { MessageReceiver } from './MessageReceiver'
import { Debugger, MessageLogger } from './Debugger'

export class Connection {

  webSocket: WebSocket

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

  debugger: MessageLogger = Debugger

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
    this.webSocket = connection
    this.context = context
    this.document = document
    this.request = request
    this.timeout = timeout
    this.socketId = socketId
    this.readOnly = readOnly

    this.lock = new AsyncLock()

    this.webSocket.binaryType = 'arraybuffer'
    this.document.addConnection(this)

    this.pingInterval = setInterval(this.check.bind(this), this.timeout)

    this.webSocket.on('close', this.close.bind(this))
    this.webSocket.on('message', this.handleMessage.bind(this))
    this.webSocket.on('pong', () => { this.pongReceived = true })

    this.sendCurrentAwareness()
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
      this.webSocket.readyState === WsReadyStates.Closing
      || this.webSocket.readyState === WsReadyStates.Closed
    ) {
      this.close()
    }

    try {
      this.webSocket.send(message, (error: any) => {
        if (error != null) this.close()
      })
    } catch (exception) {
      this.close()
    }
  }

  /**
   * Graceful wrapper around the WebSocket close method.
   */
  close(event?: CloseEvent): void {
    this.lock.acquire('close', (done: Function) => {

      if (this.pingInterval) {
        clearInterval(this.pingInterval)
      }

      if (!this.document.hasConnection(this)) {
        return
      }

      this.document.removeConnection(this)
      this.callbacks.onClose(this.document)
      this.webSocket.close(event?.code, event?.reason)

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
        this.webSocket.ping()
      } catch (exception) {
        this.close()
      }
    }
  }

  /**
   * Send the current document awareness to the client, if any
   * @private
   */
  private sendCurrentAwareness(): void {
    if (!this.document.hasAwarenessStates()) {
      return
    }

    const awarenessMessage = new OutgoingMessage()
      .createAwarenessUpdateMessage(this.document.awareness)

    this.debugger.log({
      direction: 'out',
      type: awarenessMessage.type,
      category: awarenessMessage.category,
    })

    this.send(awarenessMessage.toUint8Array())
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
   * @deprecated
   */
  get instance(): WebSocket {
    console.warn('connection.instance is deprecated, use `connection.webSocket` instead.')

    return this.webSocket
  }

  /**
   * Get the underlying connection instance
   * @deprecated
   */
  public get connection(): WebSocket {
    console.warn('connection.connection is deprecated, use `connection.webSocket` instead.')

    return this.webSocket
  }
}

export default Connection
