import * as encoding from 'lib0/encoding'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class CloseMessage extends OutgoingMessage {
  type = MessageType.CLOSE

  description = 'Ask the server to close the connection'

  get(args: Partial<OutgoingMessageArguments>) {
    encoding.writeVarString(this.encoder, args.documentName!)
    encoding.writeVarUint(this.encoder, this.type)

    return this.encoder
  }
}
