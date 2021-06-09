import * as encoding from 'lib0/encoding'
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness'
import { MessageType, OutgoingMessageArguments } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class AwarenessMessage extends OutgoingMessage {
  type = MessageType.Awareness

  description = 'Awareness states update'

  get(args: Partial<OutgoingMessageArguments>) {
    if (typeof args.awareness === 'undefined') {
      throw new Error('The awareness message requires awareness as an argument')
    }

    if (typeof args.clients === 'undefined') {
      throw new Error('The awareness message requires clients as an argument')
    }

    encoding.writeVarUint(this.encoder, this.type)

    let awarenessUpdate
    if (args.states === undefined) {
      awarenessUpdate = encodeAwarenessUpdate(args.awareness, args.clients)
    } else {
      awarenessUpdate = encodeAwarenessUpdate(args.awareness, args.clients, args.states)
    }

    encoding.writeVarUint8Array(this.encoder, awarenessUpdate)

    return this.encoder
  }
}
