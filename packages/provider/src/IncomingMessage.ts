import {
  createDecoder,
  readVarUint,
  readVarUint8Array,
  readVarString,
  Decoder,
} from 'lib0/decoding'
import {
  Encoder,
  createEncoder,
  writeVarUint,
  writeVarUint8Array,
  writeVarString,
  length,
} from 'lib0/encoding'
import { MessageType } from './types'

export class IncomingMessage {

  data: any

  encoder: Encoder

  decoder: Decoder

  constructor(data: any) {
    this.data = data
    this.encoder = createEncoder()
    this.decoder = createDecoder(new Uint8Array(this.data))
  }

  readVarUint(): MessageType {
    return readVarUint(this.decoder)
  }

  readVarString(): string {
    return readVarString(this.decoder)
  }

  readVarUint8Array() {
    return readVarUint8Array(this.decoder)
  }

  writeVarUint(type: MessageType) {
    return writeVarUint(this.encoder, type)
  }

  writeVarString(string: string) {
    return writeVarString(this.encoder, string)
  }

  writeVarUint8Array(data: Uint8Array) {
    return writeVarUint8Array(this.encoder, data)
  }

  length() {
    return length(this.encoder)
  }
}
