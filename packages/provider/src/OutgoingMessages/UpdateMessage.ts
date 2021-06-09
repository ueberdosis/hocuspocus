import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import { MessageType } from '../types'
import { OutgoingMessage } from '../OutgoingMessage'

export class UpdateMessage extends OutgoingMessage {
  type = MessageType.Sync

  get(update: Uint8Array) {
    encoding.writeVarUint(this.encoder, this.type)
    syncProtocol.writeUpdate(this.encoder, update)
    return encoding.toUint8Array(this.encoder)
  }
}
