import * as Y from 'yjs'
import * as encoding from 'lib0/encoding'
import * as syncProtocol from 'y-protocols/sync'
import { MessageTypes } from '../types'
import { OutgoingMessage } from './OutgoingMessage'

export class SyncStepOneMessage extends OutgoingMessage {
  get(document: Y.Doc) {
    encoding.writeVarUint(this.encoder, MessageTypes.Sync)
    syncProtocol.writeSyncStep1(this.encoder, document)
    return encoding.toUint8Array(this.encoder)
  }
}
