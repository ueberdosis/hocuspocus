import { IncomingMessage as HTTPIncomingMessage } from 'http'
import AsyncLock from 'async-lock'
import WebSocket from 'ws'
import {
  CloseEvent, ConnectionTimeout, Forbidden, WsReadyStates,
} from '@hocuspocus/common'
import Document from './Document'
import { IncomingMessage } from './IncomingMessage'
import { OutgoingMessage } from './OutgoingMessage'
import { MessageReceiver } from './MessageReceiver'
import { Debugger } from './Debugger'
import { onStatelessPayload } from './types'

export class Connection {

  webSocket: WebSocket

  context: any

  document: Document

  pingInterval: NodeJS.Timeout

  pongReceived = true

  request: HTTPIncomingMessage

  timeout: number

  callbacks: any = {
    onClose: [(document: Document, event?: CloseEvent) => null],
    beforeHandleMessage: (connection: Connection, update: Uint8Array) => Promise,
    statelessCallback: () => Promise,
  }

  socketId: string

  lock: AsyncLock

  readOnly: Boolean

  logger: Debugger

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
    logger: Debugger,
  ) {
    this.webSocket = connection
    this.context = context
    this.document = document
    this.request = request
    this.timeout = timeout
    this.socketId = socketId
    this.readOnly = readOnly
    this.logger = logger

    this.lock = new AsyncLock()

    this.webSocket.binaryType = 'arraybuffer'
    this.document.addConnection(this)

    this.pingInterval = setInterval(this.check.bind(this), this.timeout)

    this.webSocket.on('close', this.boundClose)
    this.webSocket.on('message', this.boundHandleMessage)
    this.webSocket.on('pong', this.boundHandlePong)

    this.sendCurrentAwareness()
  }

  boundClose = this.close.bind(this)

  boundHandleMessage = this.handleMessage.bind(this)

  boundHandlePong = this.handlePong.bind(this)

  handlePong() {
    this.pongReceived = true
  }

  /**
   * Set a callback that will be triggered when the connection is closed
   */
  onClose(callback: (document: Document, event?: CloseEvent) => void): Connection {
    this.callbacks.onClose.push(callback)

    return this
  }

  /**
   * Set a callback that will be triggered when an stateless message is received
   */
  onStatelessCallback(callback: (payload: onStatelessPayload) => Promise<void>): Connection {
    this.callbacks.statelessCallback = callback

    return this
  }

  /**
   * Set a callback that will be triggered before an message is handled
   */
  beforeHandleMessage(callback: (connection: Connection, update: Uint8Array) => Promise<any>): Connection {
    this.callbacks.beforeHandleMessage = callback

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
   * Send a stateless message with payload
   */
  public sendStateless(payload: string): void {
    const message = new OutgoingMessage(this.document.name)
      .writeStateless(payload)

    this.logger.log({
      direction: 'out',
      type: message.type,
      category: message.category,
    })

    this.send(
      message.toUint8Array(),
    )
  }

  /**
   * Graceful wrapper around the WebSocket close method.
   */
  close(event?: CloseEvent): void {
    this.lock.acquire('close', (done: Function) => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval)
      }

      if (this.document.hasConnection(this)) {
        this.document.removeConnection(this)
        clearInterval(this.pingInterval)

        this.webSocket.removeListener('close', this.boundClose)
        this.webSocket.removeListener('message', this.boundHandleMessage)
        this.webSocket.removeListener('pong', this.boundHandlePong)

        this.callbacks.onClose.forEach((callback: (arg0: Document, arg1?: CloseEvent) => any) => callback(this.document, event))
      }

      done()
    })
  }

  /**
   * Check if pong was received and close the connection otherwise
   * @private
   */
  private check(): void {
    if (!this.pongReceived) {
      return this.close(ConnectionTimeout)
    }

    if (this.document.hasConnection(this)) {
      this.pongReceived = false

      try {
        this.webSocket.ping()
      } catch (error) {
        this.close(ConnectionTimeout)
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

    const awarenessMessage = new OutgoingMessage(this.document.name)
      .createAwarenessUpdateMessage(this.document.awareness)

    this.logger.log({
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
  private handleMessage(data: Uint8Array): void {
    const message = new IncomingMessage(data)
    const documentName = message.readVarString()

    if (documentName !== this.document.name) return

    message.writeVarString(documentName)

    this.callbacks.beforeHandleMessage(this, data)
      .then(() => {
        new MessageReceiver(
          message,
          this.logger,
        ).apply(this.document, this)
      })
      .catch((e: any) => {
        console.log('closing connection because of exception', e)
        this.close({
          code: 'code' in e ? e.code : Forbidden.code,
          reason: 'reason' in e ? e.reason : Forbidden.reason,
        })
      })
  }

}

export default Connection
