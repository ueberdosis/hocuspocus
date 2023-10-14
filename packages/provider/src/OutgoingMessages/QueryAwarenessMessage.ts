import * as encoding from 'lib0/encoding'
import { MessageType, OutgoingMessageArguments } from '../types.js'
import { OutgoingMessage } from '../OutgoingMessage.js'

export class QueryAwarenessMessage extends OutgoingMessage {
  type = MessageType.QueryAwareness

  description = 'Queries awareness states'

  get(args: Partial<OutgoingMessageArguments>) {

    encoding.writeVarString(this.encoder, args.documentName!)
    encoding.writeVarUint(this.encoder, this.type)

    return this.encoder
  }
}
