import { writeVarString, writeVarUint } from 'lib0/encoding'
import { MessageType, OutgoingMessageArguments } from '../types.js'
import { OutgoingMessage } from '../OutgoingMessage.js'

export class StatelessMessage extends OutgoingMessage {
  type = MessageType.Stateless

  description = 'A stateless message'

  get(args: Partial<OutgoingMessageArguments>) {
    writeVarString(this.encoder, args.documentName!)
    writeVarUint(this.encoder, this.type)
    writeVarString(this.encoder, args.payload ?? '')

    return this.encoder
  }
}
