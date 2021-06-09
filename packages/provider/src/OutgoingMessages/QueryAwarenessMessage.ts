import * as encoding from 'lib0/encoding'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class QueryAwarenessMessage extends OutgoingMessage {
  type = MessageType.QueryAwareness

  description = 'Queries awareness states'

  get(args: Partial<OutgoingMessageArguments>) {
    encoding.writeVarUint(this.encoder, this.type)

    return this.encoder
  }
}
