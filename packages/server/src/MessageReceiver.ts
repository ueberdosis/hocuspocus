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

export class MessageReceiver {

  message: IncomingMessage

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
        connection.send(message.toUint8Array())

        break
      case MessageType.Awareness:
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
      case messageYjsSyncStep1:
        readSyncStep1(message.decoder, message.encoder, document)
        break
      case messageYjsSyncStep2:
        if (connection?.readOnly) {
          break
        }

        readSyncStep2(message.decoder, document, null)
        break
      case messageYjsUpdate:
        if (connection?.readOnly) {
          break
        }

        readUpdate(message.decoder, document, null)
        break
      default:
        throw new Error(`Received a message with an unknown type: ${type}`)
    }

    return type
  }
}
