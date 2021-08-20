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
import {
  messageYjsSyncStep1,
  messageYjsSyncStep2,
  messageYjsUpdate,
  readSyncStep1,
  readSyncStep2,
  readUpdate,
} from 'y-protocols/sync'

import Document from './Document'
import { MessageType } from './types'
import Connection from './Connection'

export class IncomingMessage {

  decoder: Decoder

  syncMessageEncoder?: Encoder

  constructor(input: any) {
    if (!(input instanceof Uint8Array)) {
      input = new Uint8Array(input)
    }

    this.decoder = createDecoder(input)
  }

  applyTo(
    { document, connection }:
    { document: Document, connection: Connection },
  ): void {
    writeVarUint(this.encoder, MessageType.Sync)

    // this is a copy of the original y-protocols/sync/readSyncMessage function
    // which enables the read only mode
    switch (this.type) {
      case messageYjsSyncStep1:
        readSyncStep1(this.decoder, this.encoder, document)
        break

      case messageYjsSyncStep2:
        if (connection?.readOnly) {
          break
        }

        readSyncStep2(this.decoder, document, connection)
        break

      case messageYjsUpdate:
        if (connection?.readOnly) {
          break
        }

        readUpdate(this.decoder, document, connection)
        break

      default:
        // Do nothing
    }
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

  get type(): number {
    try {
      return readVarUint(this.decoder)
    } catch {
      // Failed read the message type
      return -1
    }
  }

  is(messageType: MessageType) {
    return this.type === messageType
  }

  private get encoder() {
    if (!this.syncMessageEncoder) {
      this.syncMessageEncoder = createEncoder()
    }

    return this.syncMessageEncoder
  }
}
