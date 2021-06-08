import * as encoding from 'lib0/encoding'

export class OutgoingMessage {
  encoder: encoding.Encoder

  constructor() {
    this.encoder = encoding.createEncoder()
  }
}
