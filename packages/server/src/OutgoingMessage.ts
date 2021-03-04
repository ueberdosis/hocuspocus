import {
  createEncoder,
  Encoder,
  toUint8Array,
  writeVarUint,
} from 'lib0/encoding'
import { writeSyncStep1 } from 'y-protocols/sync'
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { MessageTypes } from './types'
import Document from './Document'

export class OutgoingMessage {

  encoder: Encoder

  constructor() {
    this.encoder = createEncoder()
  }

  createSyncMessage(): OutgoingMessage {
    writeVarUint(this.encoder, MessageTypes.Sync)

    return this
  }

  createAwarenessUpdateMessage(awareness: Awareness, changedClients?: Array<any>): OutgoingMessage {
    const message = encodeAwarenessUpdate(
      awareness,
      changedClients || Array.from(awareness.getStates().keys()),
    )

    writeVarUint(this.encoder, MessageTypes.Awareness)

    return this
  }

  writeFirstSyncStepFor(document: Document): OutgoingMessage {
    writeSyncStep1(this.encoder, document)

    return this
  }

  toUint8Array(): Uint8Array {
    return toUint8Array(this.encoder)
  }
}
