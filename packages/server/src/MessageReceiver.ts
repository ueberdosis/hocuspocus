import { writeVarUint } from 'lib0/encoding'
import {
  messageYjsSyncStep1,
  messageYjsSyncStep2,
  messageYjsUpdate,
  readSyncStep1,
  readSyncStep2,
  readUpdate,
} from 'y-protocols/sync'
import { MessageType } from './types'
import Connection from './Connection'
import { IncomingMessage } from './IncomingMessage'

export class MessageReceiver {

  message: IncomingMessage

  constructor(message: IncomingMessage) {
    this.message = message
  }

  public apply(connection: Connection) {
    const { message } = this

    if (message.is(MessageType.Awareness)) {
      connection.document.applyAwarenessUpdate(connection, message.readUint8Array())

      return
    }

    writeVarUint(this.message.encoder, MessageType.Sync)

    switch (message.type) {
      case messageYjsSyncStep1:
        readSyncStep1(message.decoder, message.encoder, connection.document)
        break

      case messageYjsSyncStep2:
        if (connection?.readOnly) {
          break
        }

        readSyncStep2(message.decoder, connection.document, connection)
        break

      case messageYjsUpdate:
        if (connection?.readOnly) {
          break
        }

        readUpdate(message.decoder, connection.document, connection)
        break

      default:
        // Do nothing
    }
  }
}
