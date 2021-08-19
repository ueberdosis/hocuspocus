import * as encoding from 'lib0/encoding'
import { writeAuthentication } from '../../../../shared/protocols/auth'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class AuthenticationMessage extends OutgoingMessage {
  type = MessageType.Auth

  description = 'Authentication'

  get(args: Partial<OutgoingMessageArguments>) {
    if (typeof args.token === 'undefined') {
      throw new Error('The authentication message requires token as an argument')
    }

    encoding.writeVarUint(this.encoder, this.type)
    writeAuthentication(this.encoder, args.token)

    return this.encoder
  }
}
