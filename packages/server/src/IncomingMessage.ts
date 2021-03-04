import { readSyncMessage } from 'y-protocols/sync'
import {
  createDecoder,
  Decoder,
  readVarUint,
  readVarUint8Array,
} from 'lib0/decoding'
import {
  createEncoder,
  Encoder,
  length,
  writeVarUint,
  toUint8Array,
} from 'lib0/encoding'

import Document from './Document'
import { MessageTypes } from './types'

export class IncomingMessage {

  decoder: Decoder

  syncMessageEncoder?: Encoder

  constructor(input: any) {
    if (!(input instanceof Uint8Array)) {
      input = new Uint8Array(input)
    }

    this.decoder = createDecoder(input)
  }

  readSyncMessageAndApplyItTo(document: Document): void {
    writeVarUint(this.encoder, MessageTypes.Sync)
    readSyncMessage(this.decoder, this.encoder, document, null)
  }

  readUint8Array(): Uint8Array {
    return readVarUint8Array(this.decoder)
  }

  toUint8Array(): Uint8Array {
    return toUint8Array(this.encoder)
  }

  get length(): number {
    return length(this.encoder)
  }

  get messageType(): number {
    return readVarUint(this.decoder)
  }

  private get encoder() {
    if (!this.syncMessageEncoder) {
      this.syncMessageEncoder = createEncoder()
    }

    return this.syncMessageEncoder
  }
}
