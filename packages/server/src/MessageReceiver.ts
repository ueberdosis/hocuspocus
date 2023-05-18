import {
  messageYjsSyncStep1,
  messageYjsSyncStep2,
  messageYjsUpdate,
  readSyncStep1,
  readSyncStep2,
  readUpdate,
} from 'y-protocols/sync'
import { applyAwarenessUpdate } from 'y-protocols/awareness'
import { readVarString } from 'lib0/decoding'
import { MessageType } from './types.js'
import Connection from './Connection.js'
import { IncomingMessage } from './IncomingMessage.js'
import { OutgoingMessage } from './OutgoingMessage.js'
import { Debugger } from './Debugger.js'
import Document from './Document.js'

export class MessageReceiver {

  message: IncomingMessage

  logger: Debugger

  constructor(message: IncomingMessage, logger: Debugger) {
    this.message = message
    this.logger = logger
  }

  public apply(document: Document, connection?: Connection, reply?: (message: Uint8Array) => void) {
    const { message } = this
    const type = message.readVarUint()
    const emptyMessageLength = message.length

    switch (type) {
      case MessageType.Sync:
      case MessageType.SyncReply: {
        message.writeVarUint(MessageType.Sync)
        this.readSyncMessage(message, document, connection, reply, type !== MessageType.SyncReply)

        if (message.length > emptyMessageLength + 1) {
          if (reply) {
            reply(message.toUint8Array())
          } else if (connection) {
            // TODO: We should log this, shouldn’t we?
            // this.logger.log({
            //   direction: 'out',
            //   type: MessageType.Awareness,
            //   category: 'Update',
            // })
            connection.send(message.toUint8Array())
          }
        }

        break
      }
      case MessageType.Awareness: {
        this.logger.log({
          direction: 'in',
          type: MessageType.Awareness,
          category: 'Update',
        })

        applyAwarenessUpdate(document.awareness, message.readVarUint8Array(), connection)

        break
      }
      case MessageType.QueryAwareness: {

        this.applyQueryAwarenessMessage(document, reply)

        break
      }
      case MessageType.Stateless: {
        connection?.callbacks.statelessCallback({
          connection,
          documentName: document.name,
          document,
          payload: readVarString(message.decoder),
        })

        break
      }
      case MessageType.BroadcastStateless: {
        const msg = message.readVarString()
        document.getConnections().forEach(connection => {
          connection.sendStateless(msg)
        })
        break
      }

      case MessageType.CLOSE: {
        connection?.close({
          code: 1000,
          reason: 'provider_initiated',
        })
        break
      }
      default:
        console.error(`Unable to handle message of type ${type}: no handler defined!`)
        // Do nothing
    }
  }

  readSyncMessage(message: IncomingMessage, document: Document, connection?: Connection, reply?: (message: Uint8Array) => void, requestFirstSync = true) {
    const type = message.readVarUint()

    switch (type) {
      case messageYjsSyncStep1: {
        this.logger.log({
          direction: 'in',
          type: MessageType.Sync,
          category: 'SyncStep1',
        })

        readSyncStep1(message.decoder, message.encoder, document)

        // When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1.
        this.logger.log({
          direction: 'out',
          type: MessageType.Sync,
          category: 'SyncStep2',
        })

        if (reply && requestFirstSync) {
          const syncMessage = (new OutgoingMessage(document.name)
            .createSyncReplyMessage()
            .writeFirstSyncStepFor(document))

          this.logger.log({
            direction: 'out',
            type: MessageType.Sync,
            category: 'SyncStep1',
          })

          reply(syncMessage.toUint8Array())
        } else if (connection) {
          const syncMessage = (new OutgoingMessage(document.name)
            .createSyncMessage()
            .writeFirstSyncStepFor(document))

          this.logger.log({
            direction: 'out',
            type: MessageType.Sync,
            category: 'SyncStep1',
          })

          connection.send(syncMessage.toUint8Array())
        }
        break
      }
      case messageYjsSyncStep2:
        this.logger.log({
          direction: 'in',
          type: MessageType.Sync,
          category: 'SyncStep2',
        })

        if (connection?.readOnly) {
          break
        }

        readSyncStep2(message.decoder, document, connection)
        break
      case messageYjsUpdate:
        this.logger.log({
          direction: 'in',
          type: MessageType.Sync,
          category: 'Update',
        })

        if (connection?.readOnly) {
          break
        }

        readUpdate(message.decoder, document, connection)
        break
      default:
        throw new Error(`Received a message with an unknown type: ${type}`)
    }

    return type
  }

  applyQueryAwarenessMessage(document: Document, reply?: (message: Uint8Array) => void) {
    const message = new OutgoingMessage(document.name)
      .createAwarenessUpdateMessage(document.awareness)

    if (reply) {
      reply(message.toUint8Array())
    }

    // TODO: We should add support for WebSocket connections, too, right?
    // this.logger.log({
    //   direction: 'out',
    //   type: MessageType.Sync,
    //   category: 'SyncStep1',
    // })

    // connection.send(syncMessage.toUint8Array())
  }
}
