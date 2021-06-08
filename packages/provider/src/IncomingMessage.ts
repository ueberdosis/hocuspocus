import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as authProtocol from 'y-protocols/auth'
import { MessageTypes } from './types'
import { HocuspocusProvider } from './HocuspocusProvider'

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
