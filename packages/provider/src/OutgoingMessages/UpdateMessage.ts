import { writeVarUint } from 'lib0/encoding'
import { writeUpdate } from 'y-protocols/sync'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class UpdateMessage extends OutgoingMessage {
  type = MessageType.Sync

  description = 'A document update'

  get(args: Partial<OutgoingMessageArguments>) {
    writeVarUint(this.encoder, this.type)
    writeUpdate(this.encoder, args.update)

    return this.encoder
  }
}
