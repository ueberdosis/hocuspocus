// @ts-ignore
import awarenessProtocol from 'y-protocols/dist/awareness.cjs'
// @ts-ignore
import syncProtocol from 'y-protocols/dist/sync.cjs'
import Encoder from './Encoder'
import { MESSAGE_AWARENESS, MESSAGE_SYNC } from './utils/messageTypes'

class Messages {

  /**
   * Sync message
   * @returns {Encoder}
   */
  sync() {
    return new Encoder().int(MESSAGE_SYNC)
  }

  /**
   * Awareness update message
   * @param awareness
   * @param changedClients
   * @returns {Encoder}
   */
  awarenessUpdate(awareness: any, changedClients = null) {
    const message = awarenessProtocol.encodeAwarenessUpdate(
      awareness,
      changedClients || Array.from(awareness.getStates().keys()),
    )

    return new Encoder().int(MESSAGE_AWARENESS).int8(message)
  }

  /**
   * First sync step message
   * @param document
   * @returns {Encoder}
   */
  firstSyncStep(document: any) {
    const message = this.sync()

    syncProtocol.writeSyncStep1(message.encoder, document)

    return message
  }

  /**
   * Update message
   * @param update
   * @returns {Encoder}
   */
  update(update: any) {
    const message = this.sync()

    syncProtocol.writeUpdate(message.encoder, update)

    return message
  }

  /**
   * Read the given message and return an encoded version
   * @param decoder
   * @param document
   * @returns {Encoder}
   */
  read(decoder: any, document: any) {
    const message = this.sync()

    syncProtocol.readSyncMessage(decoder.decoder, message.encoder, document, null)

    return message
  }
}

export default new Messages()
