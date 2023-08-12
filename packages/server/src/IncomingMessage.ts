import {
  createDecoder,
  Decoder,
  readVarUint,
  readVarUint8Array,
  readVarString,
} from 'lib0/decoding'
import {
  createEncoder,
  Encoder,
  toUint8Array,
  writeVarUint,
  writeVarString,
  length,
} from 'lib0/encoding'
import { MessageType } from './types.js'

export class IncomingMessage {
  /**
   * Access to the received message.
   */
  decoder: Decoder

  /**
   * Private encoder; can be undefined.
   *
   * Lazy creation of the encoder speeds up IncomingMessages that need only a decoder.
   */
  private encoderInternal?: Encoder

  constructor(input: any) {
    if (!(input instanceof Uint8Array)) {
      input = new Uint8Array(input)
    }

    this.decoder = createDecoder(input)
  }

  get encoder() {
    if (!this.encoderInternal) {
      this.encoderInternal = createEncoder()
    }
    return this.encoderInternal
  }

  readVarUint8Array() {
    return readVarUint8Array(this.decoder)
  }

  readVarUint() {
    return readVarUint(this.decoder)
  }

  readVarString() {
    return readVarString(this.decoder)
  }

  toUint8Array() {
    return toUint8Array(this.encoder)
  }

  writeVarUint(type: MessageType) {
    writeVarUint(this.encoder, type)
  }

  writeVarString(string: string) {
    writeVarString(this.encoder, string)
  }

  get length(): number {
    return length(this.encoder)
  }
}
