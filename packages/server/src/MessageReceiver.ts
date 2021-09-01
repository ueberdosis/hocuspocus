import {
  messageYjsSyncStep1,
  messageYjsSyncStep2,
  messageYjsUpdate,
  readSyncStep1,
  readSyncStep2,
  readUpdate,
} from 'y-protocols/sync'
import { applyAwarenessUpdate } from 'y-protocols/awareness'
import { MessageType } from './types'
import Connection from './Connection'
import { IncomingMessage } from './IncomingMessage'
import { OutgoingMessage } from './OutgoingMessage'
import { Debugger, MessageLogger } from './Debugger'

export class MessageReceiver {

  message: IncomingMessage

  debugger: MessageLogger = Debugger

  constructor(message: IncomingMessage) {
    this.message = message
  }

  public apply(connection: Connection) {
    const { document } = connection
    const { message } = this
    const type = message.readVarUint()

    switch (type) {
      case MessageType.Sync:
        message.writeVarUint(MessageType.Sync)
        this.readSyncMessage(message, connection)

        if (message.length > 1) {
          connection.send(message.toUint8Array())
        }

        break
      case MessageType.Awareness:
        this.debugger.log({
          direction: 'in',
          type: MessageType.Awareness,
          category: 'Update',
        })

        applyAwarenessUpdate(document.awareness, message.readVarUint8Array(), connection)

        break
      default:
        // Do nothing
    }
  }

  readSyncMessage(message: IncomingMessage, connection: Connection) {
    const { document } = connection
    const type = message.readVarUint()

    switch (type) {
      case messageYjsSyncStep1: {
        this.debugger.log({
          direction: 'in',
          type: MessageType.Sync,
          category: 'SyncStep1',
        })

        readSyncStep1(message.decoder, message.encoder, document)

        // When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1.
        this.debugger.log({
          direction: 'out',
          type: MessageType.Sync,
          category: 'SyncStep2',
        })

        const syncMessage = (new OutgoingMessage()
          .createSyncMessage()
          .writeFirstSyncStepFor(document))

        this.debugger.log({
          direction: 'out',
          type: MessageType.Sync,
          category: 'SyncStep1',
        })

        connection.send(syncMessage.toUint8Array())

        break
      }
      case messageYjsSyncStep2:
        this.debugger.log({
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
        this.debugger.log({
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
}
