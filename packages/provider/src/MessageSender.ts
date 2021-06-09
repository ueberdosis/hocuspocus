import * as encoding from 'lib0/encoding'
import * as bc from 'lib0/broadcastchannel'
import { OutgoingMessage } from './OutgoingMessage'
import { AwarenessMessage } from './OutgoingMessages/AwarenessMessage'
import { QueryAwarenessMessage } from './OutgoingMessages/QueryAwarenessMessage'
import { SyncStepOneMessage } from './OutgoingMessages/SyncStepOneMessage'
import { SyncStepTwoMessage } from './OutgoingMessages/SyncStepTwoMessage'
import { UpdateMessage } from './OutgoingMessages/UpdateMessage'
import { Constructable } from './types'

export class MessageSender {

  encoder: encoding.Encoder

  message: any

  constructor(Message:
    Constructable<AwarenessMessage> |
    Constructable<QueryAwarenessMessage> |
    Constructable<SyncStepOneMessage> |
    Constructable<SyncStepTwoMessage> |
    Constructable<UpdateMessage>,
  args: any = {}) {
    this.message = new Message()
    this.encoder = this.message.get(args)
  }

  create() {
    return encoding.toUint8Array(this.encoder)
  }

  send(webSocket: any) {
    webSocket?.send(this.create())
  }

  broadcast(channel: string) {
    bc.publish(channel, this.create())
  }
}
