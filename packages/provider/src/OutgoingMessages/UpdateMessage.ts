import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import { MessageTypes } from '../types'
import { OutgoingMessage } from './OutgoingMessage'

export class UpdateMessage extends OutgoingMessage {
  get(update: Uint8Array) {
    encoding.writeVarUint(this.encoder, MessageTypes.Sync)
    syncProtocol.writeUpdate(this.encoder, update)
    return encoding.toUint8Array(this.encoder)
  }
}
