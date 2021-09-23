import {
  messageYjsSyncStep1,
  messageYjsSyncStep2,
  messageYjsUpdate,
  readSyncStep1,
  readSyncStep2,
  readUpdate,
} from 'y-protocols/sync'
import { applyAwarenessUpdate, Awareness } from 'y-protocols/awareness'
import {
  Document,
  IncomingMessage,
  OutgoingMessage,
  MessageType,
} from '@hocuspocus/server'

export class MessageReceiver {

  message: IncomingMessage

  constructor(message: IncomingMessage) {
    this.message = message
  }

  public apply(document: Document, reply: (message: Uint8Array) => void) {
    const { message } = this
    const type = message.readVarUint()

    switch (type) {
      case MessageType.Sync:
        message.writeVarUint(MessageType.Sync)
        this.readSyncMessage(message, document, reply)

        if (message.length > 1) {
          // reply(message.toUint8Array())
        }

        break
      case MessageType.Awareness:
        applyAwarenessUpdate(document.awareness, message.readVarUint8Array(), undefined)
        break
      case MessageType.QueryAwareness:
        this.applyQueryAwarenessMessage(document.awareness, reply)
        break
      default:
        // Do nothing
    }
  }

  readSyncMessage(message: IncomingMessage, document: Document, reply: (message: Uint8Array) => void) {
    const type = message.readVarUint()

    switch (type) {
      case messageYjsSyncStep1: {
        readSyncStep1(message.decoder, message.encoder, document)

        // When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1.
        const syncMessage = (new OutgoingMessage()
          .createSyncMessage()
          .writeFirstSyncStepFor(document))

        // reply(syncMessage.toUint8Array())

        break
      }
      case messageYjsSyncStep2:
        readSyncStep2(message.decoder, document, undefined)
        break
      case messageYjsUpdate:
        readUpdate(message.decoder, document, undefined)
        break
      default:
        throw new Error(`Received a message with an unknown type: ${type}`)
    }

    return type
  }

  applyQueryAwarenessMessage(awareness: Awareness, reply: (message: Uint8Array) => void) {
    const message = new OutgoingMessage()
      .createAwarenessUpdateMessage(awareness)

    reply(message.toUint8Array())
  }
}
