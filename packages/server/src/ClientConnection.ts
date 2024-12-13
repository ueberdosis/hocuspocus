import type { IncomingHttpHeaders, IncomingMessage } from 'http'
import type { URLSearchParams } from 'url'
import {
  Forbidden, ResetConnection, Unauthorized, WsReadyStates,
} from '@hocuspocus/common'
import * as decoding from 'lib0/decoding'
import { v4 as uuid } from 'uuid'
import type WebSocket from 'ws'
import Connection from './Connection.js'
import type Document from './Document.js'
import type { Hocuspocus } from './Hocuspocus.js'
import { IncomingMessage as SocketIncomingMessage } from './IncomingMessage.js'
import { OutgoingMessage } from './OutgoingMessage.js'
import type {
  ConnectionConfiguration,
  beforeHandleMessagePayload,
  onDisconnectPayload} from './types.js'
import {
  MessageType,
} from './types.js'
import { getParameters } from './util/getParameters.js'

/**
 * The `ClientConnection` class is responsible for handling an incoming WebSocket
 *
 * TODO-refactor:
 * - use event handlers instead of calling hooks directly, hooks should probably be called from Hocuspocus.ts
 */
export class ClientConnection {
  // this map indicates whether a `Connection` instance has already taken over for incoming message for the key (i.e. documentName)
  private readonly documentConnections: Record<string, Connection> = {}

  // While the connection will be establishing messages will
  // be queued and handled later.
  private readonly incomingMessageQueue: Record<string, Uint8Array[]> = {}

  // While the connection is establishing, kee
  private readonly documentConnectionsEstablished = new Set<string>()

  // hooks payload by Document
  private readonly hookPayloads: Record<string, {
    instance: Hocuspocus,
    request: IncomingMessage,
    requestHeaders: IncomingHttpHeaders,
    requestParameters: URLSearchParams,
    socketId: string,
    connectionConfig: ConnectionConfiguration,
    context: any,
  }> = {}

  private readonly callbacks = {
    onClose: [(document: Document, payload: onDisconnectPayload) => {}],
  }

  // Every new connection gets a unique identifier.
  private readonly socketId = uuid()

  /**
    * The `ClientConnection` class receives incoming WebSocket connections,
    * runs all hooks:
    *
    *  - onConnect for all connections
    *  - onAuthenticate only if required
    *
    * … and if nothings fails it’ll fully establish the connection and
    * load the Document then.
    */
  constructor(
    private readonly websocket: WebSocket,
    private readonly request: IncomingMessage,
    private readonly documentProvider: {
        createDocument: Hocuspocus['createDocument'],
    },
    // TODO: change to events
    private readonly hooks: Hocuspocus['hooks'],
    private readonly opts: {
        timeout: number,
    },
    private readonly defaultContext: any = {},
  ) {
    websocket.on('message', this.messageHandler)
    websocket.once('close', () => {
      websocket.removeListener('message', this.messageHandler)
    })
  }

  /**
   * Set a callback that will be triggered when the connection is closed
   */
  public onClose(callback: (document: Document, payload: onDisconnectPayload) => void): ClientConnection {
    this.callbacks.onClose.push(callback)

    return this
  }

  /**
   * Create a new connection by the given request and document
   */
  private createConnection(connection: WebSocket, document: Document): Connection {
    const hookPayload = this.hookPayloads[document.name]
    const instance = new Connection(
      connection,
      hookPayload.request,
      document,
      this.opts.timeout,
      hookPayload.socketId,
      hookPayload.context,
      hookPayload.connectionConfig.readOnly,
    )

    instance.onClose(async (document, event) => {
      const disconnectHookPayload: onDisconnectPayload = {
        instance: this.documentProvider as Hocuspocus, // TODO, this will be removed when we use events instead of hooks for this class
        clientsCount: document.getConnectionsCount(),
        context: hookPayload.context,
        document,
        socketId: hookPayload.socketId,
        documentName: document.name,
        requestHeaders: hookPayload.request.headers,
        requestParameters: getParameters(hookPayload.request),
      }

      await this.hooks('onDisconnect', disconnectHookPayload)
      this.callbacks.onClose.forEach((callback => callback(document, disconnectHookPayload)))
    })

    instance.onStatelessCallback(async payload => {
      try {
        return await this.hooks('onStateless', payload)
      } catch (error: any) {
        // TODO: weird pattern, what's the use of this?
        if (error?.message) {
          throw error
        }
      }
    })

    instance.beforeHandleMessage((connection, update) => {
      const beforeHandleMessagePayload: beforeHandleMessagePayload = {
        instance: this.documentProvider as Hocuspocus, // TODO, this will be removed when we use events instead of hooks for this class
        clientsCount: document.getConnectionsCount(),
        context: hookPayload.context,
        document,
        socketId: hookPayload.socketId,
        connection,
        documentName: document.name,
        requestHeaders: hookPayload.request.headers,
        requestParameters: getParameters(hookPayload.request),
        update,
      }

      return this.hooks('beforeHandleMessage', beforeHandleMessagePayload)
    })

    // If the WebSocket has already disconnected (wow, that was fast) – then
    // immediately call close to cleanup the connection and document in memory.
    if (
      connection.readyState === WsReadyStates.Closing
      || connection.readyState === WsReadyStates.Closed
    ) {
      instance.close()
    }

    return instance
  }

  // Once all hooks are run, we’ll fully establish the connection:
  private setUpNewConnection = async (documentName: string) => {
    const hookPayload = this.hookPayloads[documentName]
    // If no hook interrupts, create a document and connection
    const document = await this.documentProvider.createDocument(documentName, hookPayload.request, hookPayload.socketId, hookPayload.connectionConfig, hookPayload.context)
    const connection = this.createConnection(this.websocket, document)

    connection.onClose((document, event) => {
      delete this.hookPayloads[documentName]
      delete this.documentConnections[documentName]
      delete this.incomingMessageQueue[documentName]
      this.documentConnectionsEstablished.delete(documentName)
    })

    this.documentConnections[documentName] = connection

    // There’s no need to queue messages anymore.
    // Let’s work through queued messages.
    this.incomingMessageQueue[documentName].forEach(input => {
      this.websocket.emit('message', input)
    })

    this.hooks('connected', {
      ...hookPayload,
      documentName,
      context: hookPayload.context,
      connection,
    })
  }

  // This listener handles authentication messages and queues everything else.
  private handleQueueingMessage = async (data: Uint8Array) => {
    try {
      const tmpMsg = new SocketIncomingMessage(data)

      const documentName = decoding.readVarString(tmpMsg.decoder)
      const type = decoding.readVarUint(tmpMsg.decoder)

      if (!(type === MessageType.Auth && !this.documentConnectionsEstablished.has(documentName))) {
        this.incomingMessageQueue[documentName].push(data)
        return
      }
      
      // Okay, we’ve got the authentication message we’re waiting for:
      this.documentConnectionsEstablished.add(documentName)

      // The 2nd integer contains the submessage type
      // which will always be authentication when sent from client -> server
      decoding.readVarUint(tmpMsg.decoder)
      const token = decoding.readVarString(tmpMsg.decoder)

      try {
        const hookPayload = this.hookPayloads[documentName]
              
        await this.hooks('onConnect', { ...hookPayload, documentName }, (contextAdditions: any) => {
          // merge context from all hooks
          hookPayload.context = { ...hookPayload.context, ...contextAdditions }
        })

        await this.hooks('onAuthenticate', {
          token,
          ...hookPayload,
          documentName,
        }, (contextAdditions: any) => {
          // Hooks are allowed to give us even more context and we’ll merge everything together.
          // We’ll pass the context to other hooks then.
          hookPayload.context = { ...hookPayload.context, ...contextAdditions }
        })
        // All `onAuthenticate` hooks passed.
        hookPayload.connectionConfig.isAuthenticated = true

        // Let the client know that authentication was successful.
        const message = new OutgoingMessage(documentName).writeAuthenticated(hookPayload.connectionConfig.readOnly)

        this.websocket.send(message.toUint8Array())

        // Time to actually establish the connection.
        await this.setUpNewConnection(documentName)
      } catch (err: any) {
        const error = err || Forbidden
        const message = new OutgoingMessage(documentName).writePermissionDenied(error.reason ?? 'permission-denied')

        this.websocket.send(message.toUint8Array())
      }

      // Catch errors due to failed decoding of data
    } catch (error) {
      console.error(error)
      this.websocket.close(ResetConnection.code, ResetConnection.reason)
    }
  }

  private messageHandler = async (data: Uint8Array) => {
    try {
      const tmpMsg = new SocketIncomingMessage(data)

      const documentName = decoding.readVarString(tmpMsg.decoder)

      const connection = this.documentConnections[documentName]
      if (connection) {
        // forward the message to the connection
        connection.handleMessage(data)

        // we already have a `Connection` set up for this document
        return
      }

      const isFirst = this.incomingMessageQueue[documentName] === undefined
      if (isFirst) {
        this.incomingMessageQueue[documentName] = []
        if (this.hookPayloads[documentName]) {
          throw new Error('first message, but hookPayloads exists')
        }

        const hookPayload = {
          instance: this.documentProvider as Hocuspocus,
          request: this.request,
          connectionConfig: {
            readOnly: false,
            isAuthenticated: false,
          },
          requestHeaders: this.request.headers,
          requestParameters: getParameters(this.request),
          socketId: this.socketId,
          context: {
            ...this.defaultContext,
          },
        }

        this.hookPayloads[documentName] = hookPayload
      }

      this.handleQueueingMessage(data)
    } catch (closeError) {
      // catch is needed in case an invalid payload crashes the parsing of the Uint8Array
      console.error(closeError)
      this.websocket.close(Unauthorized.code, Unauthorized.reason)
    }
  }
}
