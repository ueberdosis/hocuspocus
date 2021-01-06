import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { writeSyncStep1, writeUpdate, readSyncMessage } from 'y-protocols/sync'
import Decoder from './utils/Decoder'
import Document from './Document'
import Encoder from './utils/Encoder'
import { MessageTypes } from './types'

class Messages {

  /**
   * Sync message
   */
  sync(): Encoder {
    return new Encoder().int(MessageTypes.Sync)
  }

  /**
   * Awareness update message
   */
  awarenessUpdate(awareness: Awareness, changedClients?: Array<any>): Encoder {
    const message = encodeAwarenessUpdate(
      awareness,
      changedClients || Array.from(awareness.getStates().keys()),
    )

    return new Encoder().int(MessageTypes.Awareness).int8(message)
  }

  /**
   * First sync step message
   */
  firstSyncStep(document: Document): Encoder {
    const message = this.sync()

    writeSyncStep1(message.encoder, document)

    return message
  }

  /**
   * Update message
   */
  update(update: Uint8Array): Encoder {
    const message = this.sync()

    writeUpdate(message.encoder, update)

    return message
  }

  /**
   * Read the given message and return an encoded version
   */
  read(decoder: Decoder, document: Document): Encoder {
    const message = this.sync()

    readSyncMessage(decoder.decoder, message.encoder, document, null)

    return message
  }
}

export default new Messages()
