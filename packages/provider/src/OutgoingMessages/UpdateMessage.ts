import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class UpdateMessage extends OutgoingMessage {
  type = MessageType.Sync

  description = 'A document update'

  get(args: Partial<OutgoingMessageArguments>) {
    encoding.writeVarUint(this.encoder, this.type)
    syncProtocol.writeUpdate(this.encoder, args.update)

    return this.encoder
  }
}
