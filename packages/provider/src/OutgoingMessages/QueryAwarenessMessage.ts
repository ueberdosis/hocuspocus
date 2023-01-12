import * as encoding from 'lib0/encoding'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class QueryAwarenessMessage extends OutgoingMessage {
  type = MessageType.QueryAwareness

  description = 'Queries awareness states'

  get(args: Partial<OutgoingMessageArguments>) {

    console.log('queryAwareness: writing string docName', args.documentName)
    console.log(this.encoder.cpos)

    encoding.writeVarString(this.encoder, args.documentName!)
    encoding.writeVarUint(this.encoder, this.type)

    return this.encoder
  }
}
