import type { IncomingMessage as HTTPIncomingMessage } from 'http'
import AsyncLock from 'async-lock'
import type WebSocket from 'ws'
import type {
  CloseEvent} from '@hocuspocus/common'
import {  Forbidden, WsReadyStates } from '@hocuspocus/common'
import type Document from './Document.js'
import { IncomingMessage } from './IncomingMessage.js'
import { OutgoingMessage } from './OutgoingMessage.js'
import { MessageReceiver } from './MessageReceiver.js'
import type { Debugger } from './Debugger.js'
import type { onStatelessPayload } from './types.js'

export class Connection {

  webSocket: WebSocket

  context: any

  document: Document

  request: HTTPIncomingMessage

  callbacks: any = {
    onClose: [(document: Document, event?: CloseEvent) => null],
    beforeHandleMessage: (connection: Connection, update: Uint8Array) => Promise,
    statelessCallback: () => Promise,
  }

  socketId: string

  lock: AsyncLock

  readOnly: boolean

  logger: Debugger

  /**
   * Constructor.
   */
  constructor(
    connection: WebSocket,
    request: HTTPIncomingMessage,
    document: Document,
    socketId: string,
    context: any,
    readOnly = false,
    logger: Debugger,
  ) {
    this.webSocket = connection
    this.context = context
    this.document = document
    this.request = request
    this.socketId = socketId
    this.readOnly = readOnly
    this.logger = logger

    this.lock = new AsyncLock()

    this.webSocket.binaryType = 'nodebuffer'
    this.document.addConnection(this)

    this.sendCurrentAwareness()
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
      return
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
      if (this.document.hasConnection(this)) {
        this.document.removeConnection(this)
        this.callbacks.onClose.forEach((callback: (arg0: Document, arg1?: CloseEvent) => any) => callback(this.document, event))
      }

      done()
    })
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
   * @public
   */
  public handleMessage(data: Uint8Array): void {
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
