import { writeVarString, writeVarUint } from 'lib0/encoding'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class StatelessMessage extends OutgoingMessage {
  type = MessageType.Stateless

  description = 'A stateless message'

  get(args: Partial<OutgoingMessageArguments>) {
    writeVarUint(this.encoder, this.type)
    writeVarString(this.encoder, args.payload ?? '')

    return this.encoder
  }
}
