import { Encoder, toUint8Array } from 'lib0/encoding'
import * as bc from 'lib0/broadcastchannel'
import { ConstructableOutgoingMessage } from './types.js'

export class MessageSender {

  encoder: Encoder

  message: any

  constructor(Message: ConstructableOutgoingMessage, args: any = {}) {
    this.message = new Message()
    this.encoder = this.message.get(args)
  }

  create() {
    return toUint8Array(this.encoder)
  }

  send(webSocket: any) {
    webSocket?.send(this.create())
  }

  broadcast(channel: string) {
    bc.publish(channel, this.create())
  }
}
