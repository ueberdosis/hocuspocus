import * as encoding from 'lib0/encoding'
import { MessageTypes } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class QueryAwarenessMessage extends OutgoingMessage {
  get() {
    encoding.writeVarUint(this.encoder, MessageTypes.QueryAwareness)
    return encoding.toUint8Array(this.encoder)
  }
}
