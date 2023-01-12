import { writeVarString, writeVarUint } from 'lib0/encoding'
import { writeUpdate } from 'y-protocols/sync'
import * as encoding from 'lib0/dist/encoding'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class UpdateMessage extends OutgoingMessage {
  type = MessageType.Sync

  description = 'A document update'

  get(args: Partial<OutgoingMessageArguments>) {
    writeVarString(this.encoder, args.documentName!)
    writeVarUint(this.encoder, this.type)
    writeUpdate(this.encoder, args.update)

    return this.encoder
  }
}
