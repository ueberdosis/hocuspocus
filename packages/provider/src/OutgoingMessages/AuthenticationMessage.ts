import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class AuthenticationMessage extends OutgoingMessage {
  type = MessageType.Auth

  description = 'Optional authentication'

  get(args: Partial<OutgoingMessageArguments>) {
    if (typeof args.authentication === 'undefined') {
      throw new Error('The authentication message requires authentication as an argument')
    }

    return args.authentication
  }
}
