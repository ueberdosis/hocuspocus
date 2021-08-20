import {
  createDecoder,
  Decoder,
  readVarUint,
  readVarUint8Array,
} from 'lib0/decoding'
import {
  createEncoder,
  Encoder,
  toUint8Array,
  writeVarUint,
  length,
} from 'lib0/encoding'
import { MessageType } from './types'

export class IncomingMessage {
  /**
   * Access to the received message.
   */
  decoder: Decoder

  /**
   * Access to the reply.
   */
  encoder: Encoder

  constructor(input: any) {
    if (!(input instanceof Uint8Array)) {
      input = new Uint8Array(input)
    }

    this.encoder = createEncoder()
    this.decoder = createDecoder(input)
  }

  readVarUint8Array() {
    return readVarUint8Array(this.decoder)
  }

  readVarUint() {
    return readVarUint(this.decoder)
  }

  toUint8Array() {
    return toUint8Array(this.encoder)
  }

  writeVarUint(type: MessageType) {
    writeVarUint(this.encoder, type)
  }

  get length(): number {
    return length(this.encoder)
  }
}
