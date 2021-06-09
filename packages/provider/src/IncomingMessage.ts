import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { MessageType } from './types'

export class IncomingMessage {

  data: any

  encoder: encoding.Encoder

  decoder: decoding.Decoder

  type: MessageType

  constructor(data: any) {
    this.data = data
    this.encoder = encoding.createEncoder()
    this.decoder = decoding.createDecoder(new Uint8Array(this.data))
    this.type = decoding.readVarUint(this.decoder)
  }
}
