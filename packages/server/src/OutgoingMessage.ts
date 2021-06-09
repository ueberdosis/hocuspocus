import {
  createEncoder,
  Encoder,
  toUint8Array,
  writeVarUint,
  writeVarUint8Array,
} from 'lib0/encoding'
import { writeSyncStep1, writeUpdate } from 'y-protocols/sync'
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'

import { MessageType } from './types'
import Document from './Document'

export class OutgoingMessage {

  encoder: Encoder

  constructor() {
    this.encoder = createEncoder()
  }

  createSyncMessage(): OutgoingMessage {
    writeVarUint(this.encoder, MessageType.Sync)

    return this
  }

  createAwarenessUpdateMessage(awareness: Awareness, changedClients?: Array<any>): OutgoingMessage {
    const message = encodeAwarenessUpdate(
      awareness,
      changedClients || Array.from(awareness.getStates().keys()),
    )

    writeVarUint(this.encoder, MessageType.Awareness)
    writeVarUint8Array(this.encoder, message)

    return this
  }

  writeFirstSyncStepFor(document: Document): OutgoingMessage {
    writeSyncStep1(this.encoder, document)

    return this
  }

  writeUpdate(update: Uint8Array): OutgoingMessage {
    writeUpdate(this.encoder, update)

    return this
  }

  toUint8Array(): Uint8Array {
    return toUint8Array(this.encoder)
  }
}
