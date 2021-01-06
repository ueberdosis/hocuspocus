import { encodeAwarenessUpdate } from 'y-protocols/awareness'
import { writeSyncStep1, writeUpdate, readSyncMessage } from 'y-protocols/sync'
import Decoder from './utils/Decoder'
import Document from './Document'
import Encoder from './utils/Encoder'
import { MessageTypes } from './types'

class Messages {

  /**
   * Sync message
   * @returns {Encoder}
   */
  sync(): Encoder {
    return new Encoder().int(MessageTypes.Sync)
  }

  /**
   * Awareness update message
   * @param awareness
   * @param changedClients
   * @returns {Encoder}
   */
  awarenessUpdate(awareness: any, changedClients = null): Encoder {
    const message = encodeAwarenessUpdate(
      awareness,
      changedClients || Array.from(awareness.getStates().keys()),
    )

    return new Encoder().int(MessageTypes.Awareness).int8(message)
  }

  /**
   * First sync step message
   * @param document
   * @returns {Encoder}
   */
  firstSyncStep(document: Document): Encoder {
    const message = this.sync()

    writeSyncStep1(message.encoder, document)

    return message
  }

  /**
   * Update message
   * @param update
   * @returns {Encoder}
   */
  update(update: Uint8Array): Encoder {
    const message = this.sync()

    writeUpdate(message.encoder, update)

    return message
  }

  /**
   * Read the given message and return an encoded version
   * @param decoder
   * @param document
   * @returns {Encoder}
   */
  read(decoder: Decoder, document: Document): Encoder {
    const message = this.sync()

    readSyncMessage(decoder.decoder, message.encoder, document, null)

    return message
  }
}

export default new Messages()
