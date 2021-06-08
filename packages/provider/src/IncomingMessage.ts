import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'

export class IncomingMessage {

  encoder: encoding.Encoder

  decoder: decoding.Decoder

  constructor(input: any) {
    this.encoder = encoding.createEncoder()
    this.decoder = decoding.createDecoder(input)
  }

  get type(): number {
    return decoding.readVarUint(this.decoder)
  }
}
