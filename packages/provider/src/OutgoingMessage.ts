import * as encoding from 'lib0/encoding'
import { MessageType } from './types'

export class OutgoingMessage {
  encoder: encoding.Encoder

  type?: MessageType

  constructor() {
    this.encoder = encoding.createEncoder()
  }

  get name() {
    if (typeof this.type === 'number') {
      return MessageType[this.type]
    }

    throw new Error('Type for outgoing message not set.')
  }
}
