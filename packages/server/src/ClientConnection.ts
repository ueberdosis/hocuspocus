import { IncomingMessage } from 'http'
import {
  Forbidden, Unauthorized, WsReadyStates,
} from '@hocuspocus/common'
import * as decoding from 'lib0/decoding'
import { v4 as uuid } from 'uuid'
import WebSocket from 'ws'

import Connection from './Connection.js'
import { Debugger } from './Debugger.js'
import Document from './Document.js'
import type { Hocuspocus } from './Hocuspocus.js'
import { IncomingMessage as SocketIncomingMessage } from './IncomingMessage.js'
import { OutgoingMessage } from './OutgoingMessage.js'
import {
  ConnectionConfiguration,
  MessageType,
  beforeHandleMessagePayload,
  onDisconnectPayload,
} from './types.js'
import { getParameters } from './util/getParameters.js'

/**
 * The `ClientConnection` class is responsible for handling an incoming WebSocket
 *
 * TODO-refactor:
 * - untangle code: extract all nested methods to top level handlers
 * - use event handlers instead of calling hooks directly, hooks should probably be called from Hocuspocus.ts
 */
export class ClientConnection {
  private readonly callbacks = {
    onClose: [(document: Document, payload: onDisconnectPayload) => {}],
  }

  /**
    * The `handleConnection` method receives incoming WebSocket connections,
    * runs all hooks:
    *
    *  - onConnect for all connections
    *  - onAuthenticate only if required
    *
    * … and if nothings fails it’ll fully establish the connection and
    * load the Document then.
    */
  constructor(
    incoming: WebSocket,
    request: IncomingMessage,
    context: any = null,
    private readonly documentProvider: {
        createDocument: Hocuspocus['createDocument'],
    },
    // TODO: change to events
    private readonly hooks: Hocuspocus['hooks'],
    private readonly debuggerTool: Debugger,
    private readonly opts: {
        requiresAuthentication: boolean,
        timeout: number,
    },
  ) {
    // Make sure to close an idle connection after a while.
    const closeIdleConnection = setTimeout(() => {
      incoming.close(Unauthorized.code, Unauthorized.reason)
    }, opts.timeout)

    // Every new connection gets a unique identifier.
    const socketId = uuid()

    // To override settings for specific connections, we’ll
    // keep track of a few things in the `ConnectionConfiguration`.
    const connection: ConnectionConfiguration = {
      readOnly: false,
      requiresAuthentication: opts.requiresAuthentication,
      isAuthenticated: false,
    }

    // The `onConnect` and `onAuthenticate` hooks need some context
    // to decide who’s connecting, so let’s put it together:
    // TODO, keeping one instance of hookPayload causes issues like https://github.com/ueberdosis/hocuspocus/pull/613
    const hookPayload = {
      instance: documentProvider as Hocuspocus, // TODO, this will be removed when we use events instead of hooks for this class
      request,
      requestHeaders: request.headers,
      requestParameters: getParameters(request),
      socketId,
      connection,
    }

    // this map indicates whether a `Connection` instance has already taken over for incoming message for the key (i.e. documentName)
    const documentConnections: Record<string, boolean> = {}

    // While the connection will be establishing messages will
    // be queued and handled later.
    const incomingMessageQueue: Record<string, Uint8Array[]> = {}

    // While the connection is establishing
    const connectionEstablishing: Record<string, boolean> = {}

    // Once all hooks are run, we’ll fully establish the connection:
    const setUpNewConnection = async (documentName: string) => {
      // Not an idle connection anymore, no need to close it then.
      clearTimeout(closeIdleConnection)

      // If no hook interrupts, create a document and connection
      const document = await documentProvider.createDocument(documentName, request, socketId, connection, context)
      const instance = this.createConnection(incoming, request, document, socketId, connection.readOnly, context)

      instance.onClose((document, event) => {
        delete documentConnections[documentName]
        delete incomingMessageQueue[documentName]
        delete connectionEstablishing[documentName]

        if (Object.keys(documentConnections).length === 0) {
          instance.webSocket.close(event?.code, event?.reason) // TODO: Move this to Hocuspocus connection handler
        }
      })

      documentConnections[documentName] = true

      // There’s no need to queue messages anymore.
      // Let’s work through queued messages.
      incomingMessageQueue[documentName].forEach(input => {
        incoming.emit('message', input)
      })

      this.hooks('connected', {
        ...hookPayload,
        documentName,
        context,
        connectionInstance: instance,
      })
    }

    // This listener handles authentication messages and queues everything else.
    const handleQueueingMessage = async (data: Uint8Array) => {
      try {
        const tmpMsg = new SocketIncomingMessage(data)

        const documentName = decoding.readVarString(tmpMsg.decoder)
        const type = decoding.readVarUint(tmpMsg.decoder)

        if (!(type === MessageType.Auth && !connectionEstablishing[documentName])) {
          incomingMessageQueue[documentName].push(data)
          return
        }

        // Okay, we’ve got the authentication message we’re waiting for:
        connectionEstablishing[documentName] = true

        // The 2nd integer contains the submessage type
        // which will always be authentication when sent from client -> server
        decoding.readVarUint(tmpMsg.decoder)
        const token = decoding.readVarString(tmpMsg.decoder)

        this.debuggerTool.log({
          direction: 'in',
          type,
          category: 'Token',
        })

        try {
          await this.hooks('onAuthenticate', {
            token,
            ...hookPayload,
            documentName,
          }, (contextAdditions: any) => {
            // Hooks are allowed to give us even more context and we’ll merge everything together.
            // We’ll pass the context to other hooks then.
            context = { ...context, ...contextAdditions }
          })
          // All `onAuthenticate` hooks passed.
          connection.isAuthenticated = true

          // Let the client know that authentication was successful.
          const message = new OutgoingMessage(documentName).writeAuthenticated(connection.readOnly)

          this.debuggerTool.log({
            direction: 'out',
            type: message.type,
            category: message.category,
          })

          incoming.send(message.toUint8Array())

          // Time to actually establish the connection.
          await setUpNewConnection(documentName)
        } catch (err: any) {
          const error = err || Forbidden
          const message = new OutgoingMessage(documentName).writePermissionDenied(error.reason ?? 'permission-denied')

          this.debuggerTool.log({
            direction: 'out',
            type: message.type,
            category: message.category,
          })

          // Ensure that the permission denied message is sent before the
          // connection is closed
          incoming.send(message.toUint8Array(), () => {
            if (Object.keys(documentConnections).length === 0) {
              try {
                incoming.close(error.code ?? Forbidden.code, error.reason ?? Forbidden.reason)
              } catch (closeError) {
                // catch is needed in case invalid error code is returned by hook (that would fail sending the close message)
                console.error(closeError)
                incoming.close(Forbidden.code, Forbidden.reason)
              }
            }
          })
        }

        // Catch errors due to failed decoding of data
      } catch (error) {
        console.error(error)
        incoming.close(Unauthorized.code, Unauthorized.reason)
      }
    }

    const messageHandler = async (data: Uint8Array) => {
      try {
        const tmpMsg = new SocketIncomingMessage(data)

        const documentName = decoding.readVarString(tmpMsg.decoder)

        if (documentConnections[documentName] === true) {
          // we already have a `Connection` set up for this document
          return
        }

        const isFirst = incomingMessageQueue[documentName] === undefined
        if (isFirst) {
          incomingMessageQueue[documentName] = []
        }
        handleQueueingMessage(data)

        if (isFirst) {
          // if this is the first message, trigger onConnect & check if we can start the connection (only if no auth is required)
          try {
            await this.hooks('onConnect', { ...hookPayload, documentName }, (contextAdditions: any) => {
              // merge context from all hooks
              context = { ...context, ...contextAdditions }
            })

            if (connection.requiresAuthentication || connectionEstablishing[documentName]) {
              // Authentication is required, we’ll need to wait for the Authentication message.
              return
            }
            connectionEstablishing[documentName] = true

            await setUpNewConnection(documentName)
          } catch (err: any) {
            // if a hook interrupts, close the websocket connection
            const error = err || Forbidden
            try {
              incoming.close(error.code ?? Forbidden.code, error.reason ?? Forbidden.reason)
            } catch (closeError) {
              // catch is needed in case invalid error code is returned by hook (that would fail sending the close message)
              console.error(closeError)
              incoming.close(Unauthorized.code, Unauthorized.reason)
            }
          }
        }
      } catch (closeError) {
        // catch is needed in case an invalid payload crashes the parsing of the Uint8Array
        console.error(closeError)
        incoming.close(Unauthorized.code, Unauthorized.reason)
      }
    }

    incoming.on('message', messageHandler)
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
  private createConnection(connection: WebSocket, request: IncomingMessage, document: Document, socketId: string, readOnly = false, context?: any): Connection {
    const instance = new Connection(
      connection,
      request,
      document,
      this.opts.timeout,
      socketId,
      context,
      readOnly,
      this.debuggerTool,
    )

    instance.onClose(async (document, event) => {
      const hookPayload = {
        instance: this.documentProvider as Hocuspocus, // TODO, this will be removed when we use events instead of hooks for this class
        clientsCount: document.getConnectionsCount(),
        context,
        document,
        socketId,
        documentName: document.name,
        requestHeaders: request.headers,
        requestParameters: getParameters(request),
      }

      await this.hooks('onDisconnect', hookPayload)
      this.callbacks.onClose.forEach((callback => callback(document, hookPayload)))
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
      const hookPayload: beforeHandleMessagePayload = {
        instance: this.documentProvider as Hocuspocus, // TODO, this will be removed when we use events instead of hooks for this class
        clientsCount: document.getConnectionsCount(),
        context,
        document,
        socketId,
        connection,
        documentName: document.name,
        requestHeaders: request.headers,
        requestParameters: getParameters(request),
        update,
      }

      return this.hooks('beforeHandleMessage', hookPayload)
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

}
