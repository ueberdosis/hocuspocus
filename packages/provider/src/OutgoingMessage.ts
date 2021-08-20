import { Encoder, createEncoder, toUint8Array } from 'lib0/encoding'
import { MessageType, OutgoingMessageInterface } from './types'

export class OutgoingMessage implements OutgoingMessageInterface {
  encoder: Encoder

  type?: MessageType

  constructor() {
    this.encoder = createEncoder()
  }

  toUint8Array() {
    return toUint8Array(this.encoder)
  }
}
