import { Encoder, createEncoder, toUint8Array } from 'lib0/encoding'
import { MessageType, OutgoingMessageArguments, OutgoingMessageInterface } from './types.js'

export class OutgoingMessage implements OutgoingMessageInterface {
  encoder: Encoder

  type?: MessageType

  constructor() {
    this.encoder = createEncoder()
  }

  get(args: Partial<OutgoingMessageArguments>) {
    return args.encoder
  }

  toUint8Array() {
    return toUint8Array(this.encoder)
  }
}
